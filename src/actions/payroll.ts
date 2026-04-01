"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addPersonToProject } from "@/actions/projects";
import { prisma } from "@/lib/db";
import { splitNameParts } from "@/lib/crew-list-import-parse";
import { computeFullName } from "@/lib/person";
import { serializePersonForClient } from "@/lib/serialize";
import { getPersonSensitivePlainForServerUse } from "@/lib/person-sensitive";
import { maskBankAccount, maskNationalId } from "@/lib/sensitive-masking";
import { formatNorwegianMobileFromRaw } from "@/lib/norwegian-mobile";
import { validatePayrollRowsForSave } from "@/lib/payroll-row-validation";
import { formatPayrollProjectLabel } from "@/lib/utils";
import { resolveRateForProject, resolveRoleForProject } from "@/lib/snapshot";

/** Dekryptert kontonummer/personnummer fra crew-profil — brukes når rad opprettes fra person. */
export async function getPayrollSensitiveFieldsFromPerson(personId: string) {
  return getPersonSensitivePlainForServerUse(personId);
}

const rowInputSchema = z.object({
  isSectionHeader: z.boolean(),
  sectionTitle: z.string().nullable().optional(),
  personId: z.string().nullable().optional(),
  fullName: z.preprocess((v) => (v == null ? "" : String(v)), z.string()),
  projectLabel: z.preprocess((v) => (v == null ? "" : String(v)), z.string()),
  addressLine: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  honorar: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    if (typeof val === "string") {
      const n = Number(val.replace(",", ".").trim());
      return Number.isFinite(n) ? n : null;
    }
    if (typeof val === "number" && !Number.isNaN(val)) return val;
    return null;
  }, z.number().nullable().optional()),
  includesHolidayPay: z.boolean(),
  nationalId: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  sensitiveFieldsMaskInUi: z.boolean().optional().default(false),
  segment: z.enum(["crew", "cast"]),
});

const saveSchema = z.array(rowInputSchema);

function revalidatePayrollPaths(projectId: string, listId?: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/lonningsliste`);
  if (listId) {
    revalidatePath(`/projects/${projectId}/lonningsliste/${listId}`);
    revalidatePath(`/projects/${projectId}/lonningsliste/${listId}/print`);
  }
}

export async function createPayrollList(projectId: string, title?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Ukjent prosjekt" as const };

  const count = await prisma.payrollList.count({ where: { projectId } });
  const t = (title?.trim() || `Lønningsliste ${count + 1}`).slice(0, 120);

  const list = await prisma.payrollList.create({
    data: { projectId, title: t },
  });

  revalidatePayrollPaths(projectId, list.id);
  return { ok: true as const, id: list.id };
}

export async function createPayrollListFormAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return;
  const title = String(formData.get("title") ?? "").trim();
  const res = await createPayrollList(projectId, title || undefined);
  if ("error" in res) return;
  redirect(`/projects/${projectId}/lonningsliste/${res.id}`);
}

export async function deletePayrollList(projectId: string, listId: string) {
  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
  });
  if (!list) return;

  await prisma.payrollList.delete({ where: { id: listId } });
  revalidatePayrollPaths(projectId);
}

export async function getPayrollListIndexData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) return null;

  const lists = await prisma.payrollList.findMany({
    where: { projectId },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      submitted: true,
      updatedAt: true,
      _count: { select: { rows: true } },
    },
  });

  return { project, lists };
}

export async function getPayrollPageData(
  projectId: string,
  listId: string,
  options?: { maskSensitiveForUi?: boolean },
) {
  try {
    return await loadPayrollPageData(projectId, listId, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    // Én streng per linje — lettere å søke i Vercel Logs enn console.error(objekt)
    console.error(
      `APARENT_PAYROLL_FETCH_FAILED projectId=${projectId} listId=${listId} message=${JSON.stringify(message)} stack=${stack ? JSON.stringify(stack) : ""}`,
    );
    throw err;
  }
}

async function loadPayrollPageData(
  projectId: string,
  listId: string,
  options?: { maskSensitiveForUi?: boolean },
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      internalTitle: true,
      customer: { select: { name: true } },
    },
  });
  if (!project) return null;

  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
    include: {
      rows: {
        orderBy: [{ sortOrder: "asc" }],
        include: {
          person: { select: { dietaryPreference: true } },
        },
      },
    },
  });
  if (!list) return null;

  const crew = await prisma.projectCrew.findMany({
    where: { projectId, isActive: true },
    include: { person: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const defaultProjectLabel = formatPayrollProjectLabel(project);
  const maskUi = options?.maskSensitiveForUi === true;

  logPayrollFetchOk(projectId, list.id, list.rows.length, crew.length);

  return {
    project,
    listId: list.id,
    listTitle: list.title,
    submitted: list.submitted,
    documentSavedAt: list.documentSavedAt,
    listUpdatedAt: list.updatedAt.getTime(),
    rows: list.rows.map((r) => {
      const useMask = maskUi && r.sensitiveFieldsMaskInUi;
      return {
        id: r.id,
        isSectionHeader: r.isSectionHeader,
        sectionTitle: r.sectionTitle,
        personId: r.personId,
        fullName: r.fullName,
        projectLabel: r.projectLabel,
        addressLine: r.addressLine,
        postalCode: r.postalCode,
        city: r.city,
        country: r.country,
        honorar: r.honorar != null ? Number(r.honorar) : null,
        includesHolidayPay: r.includesHolidayPay,
        nationalId: useMask
          ? maskNationalId(r.nationalId)
          : r.nationalId,
        bankAccount: useMask
          ? maskBankAccount(r.bankAccount)
          : r.bankAccount,
        mobile: r.mobile,
        email: r.email,
        sensitiveFieldsMaskInUi: r.sensitiveFieldsMaskInUi,
        segment: r.segment,
        dietaryPreference: r.person?.dietaryPreference ?? null,
      };
    }),
    crew: crew.map((pc) => ({
      projectCrewId: pc.id,
      personId: pc.person.id,
      fullName: pc.person.fullName,
      phone: pc.person.phone,
      email: pc.person.email,
      addressLine: pc.person.addressLine,
      postalCode: pc.person.postalCode,
      city: pc.person.city,
      country: pc.person.country,
      roleLine: resolveRoleForProject(pc),
      honorar:
        resolveRateForProject(pc) != null
          ? Number(resolveRateForProject(pc))
          : null,
      dietaryPreference: pc.person.dietaryPreference,
    })),
    defaultProjectLabel,
  };
}

function logPayrollFetchOk(
  projectId: string,
  listId: string,
  rowCount: number,
  crewCount: number,
) {
  console.log(
    `APARENT_PAYROLL_FETCH_OK projectId=${projectId} listId=${listId} rows=${rowCount} crew=${crewCount}`,
  );
}

export type PayrollPageData = NonNullable<
  Awaited<ReturnType<typeof loadPayrollPageData>>
>;

export async function savePayrollRows(
  projectId: string,
  listId: string,
  rows: z.infer<typeof saveSchema>,
  options?: { title?: string },
) {
  const parsed = saveSchema.safeParse(rows);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? String(first.path.join(".")) : "rad";
    const detail = first?.message ?? "Ukjent valideringsfeil";
    return {
      error: `Kunne ikke lagre (${path}): ${detail}`,
    };
  }

  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
  });
  if (!list) return { error: "Listen finnes ikke" };
  if (list.submitted) {
    return {
      error:
        "Innsendte lønningslister kan ikke endres. Dupliser listen for å jobbe videre med en kopi.",
    };
  }

  let titlePatch: string | undefined;
  if (options?.title !== undefined) {
    const t = options.title.trim();
    if (!t) return { error: "Navn på liste mangler." };
    titlePatch = t.slice(0, 120);
  }

  const rowCheck = validatePayrollRowsForSave(parsed.data);
  if (!rowCheck.ok) return { error: rowCheck.error };

  const plainByPerson = new Map<
    string,
    Awaited<ReturnType<typeof getPersonSensitivePlainForServerUse>>
  >();
  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    if (r.isSectionHeader) continue;
    const mask = r.sensitiveFieldsMaskInUi === true;
    const pid = r.personId?.trim() || null;
    if (mask && pid) {
      if (!plainByPerson.has(pid)) {
        plainByPerson.set(pid, await getPersonSensitivePlainForServerUse(pid));
      }
      const plain = plainByPerson.get(pid)!;
      if (!(plain.nationalId ?? "").trim() || !(plain.bankAccount ?? "").trim()) {
        return {
          error: `Rad ${i + 1}: Personnr./kontonr. mangler for personen i databasen.`,
        };
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.payrollRow.deleteMany({ where: { payrollListId: list.id } });
    const now = new Date();
    if (parsed.data.length === 0) {
      await tx.payrollList.update({
        where: { id: list.id },
        data: {
          updatedAt: now,
          documentSavedAt: now,
          ...(titlePatch !== undefined ? { title: titlePatch } : {}),
        },
      });
      return;
    }
    const rowsToCreate = [];
    for (let i = 0; i < parsed.data.length; i++) {
      const r = parsed.data[i];
      const mask = r.sensitiveFieldsMaskInUi === true;
      const pid = r.personId?.trim() || null;
      let nationalId = r.nationalId?.trim() || null;
      let bankAccount = r.bankAccount?.trim() || null;
      if (mask && pid) {
        const plain = plainByPerson.get(pid)!;
        nationalId = plain.nationalId;
        bankAccount = plain.bankAccount;
      }
      const mobileFormatted = r.isSectionHeader
        ? null
        : formatNorwegianMobileFromRaw(r.mobile);
      rowsToCreate.push({
        payrollListId: list.id,
        sortOrder: i,
        isSectionHeader: r.isSectionHeader,
        sectionTitle: r.isSectionHeader
          ? (r.sectionTitle?.trim() || null)
          : null,
        personId: pid,
        fullName: r.isSectionHeader
          ? (r.sectionTitle?.trim() || "—")
          : r.fullName.trim(),
        projectLabel: (r.projectLabel ?? "").trim(),
        addressLine: r.addressLine?.trim() || null,
        postalCode: r.postalCode?.trim() || null,
        city: r.city?.trim() || null,
        country: r.country?.trim() || null,
        honorar:
          r.honorar != null && !Number.isNaN(r.honorar) ? r.honorar : null,
        includesHolidayPay: r.includesHolidayPay,
        nationalId,
        bankAccount,
        mobile: mobileFormatted,
        email: r.email?.trim() || null,
        sensitiveFieldsMaskInUi: mask,
        segment: r.segment,
      });
    }
    await tx.payrollRow.createMany({ data: rowsToCreate });
    await tx.payrollList.update({
      where: { id: list.id },
      data: {
        updatedAt: now,
        documentSavedAt: now,
        ...(titlePatch !== undefined ? { title: titlePatch } : {}),
      },
    });
  });

  revalidatePayrollPaths(projectId, listId);
  return { ok: true as const };
}

export async function updatePayrollListSubmitted(
  projectId: string,
  listId: string,
  submitted: boolean,
) {
  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
  });
  if (!list) return { error: "Listen finnes ikke" as const };
  if (list.submitted) {
    return {
      error:
        "Innsendte lønningslister kan ikke endres (heller ikke innsendt-status)." as const,
    };
  }

  await prisma.payrollList.update({
    where: { id: listId },
    data: { submitted },
  });

  revalidatePayrollPaths(projectId, listId);
  return { ok: true as const };
}

/** Kopierer lagret liste til ny liste (alltid «ikke innsendt»). */
export async function duplicatePayrollList(projectId: string, listId: string) {
  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
    include: { rows: { orderBy: { sortOrder: "asc" } } },
  });
  if (!list) {
    redirect(`/projects/${projectId}/lonningsliste`);
  }

  const base = list.title
    .replace(/\s*\(kopi\)\s*$/i, "")
    .trim()
    .slice(0, 100);
  const title = `${base || "Lønningsliste"} (kopi)`.slice(0, 120);

  const newList = await prisma.payrollList.create({
    data: {
      projectId,
      title,
      submitted: false,
    },
  });

  if (list.rows.length > 0) {
    await prisma.payrollRow.createMany({
      data: list.rows.map((r, i) => ({
        payrollListId: newList.id,
        sortOrder: i,
        isSectionHeader: r.isSectionHeader,
        sectionTitle: r.sectionTitle,
        personId: r.personId,
        fullName: r.fullName,
        projectLabel: r.projectLabel,
        addressLine: r.addressLine,
        postalCode: r.postalCode,
        city: r.city,
        country: r.country,
        honorar: r.honorar,
        includesHolidayPay: r.includesHolidayPay,
        nationalId: r.nationalId,
        bankAccount: r.bankAccount,
        mobile: r.mobile,
        email: r.email,
        sensitiveFieldsMaskInUi: r.sensitiveFieldsMaskInUi,
        segment: r.segment,
      })),
    });
  }

  revalidatePayrollPaths(projectId, newList.id);
  redirect(`/projects/${projectId}/lonningsliste/${newList.id}`);
}

/**
 * Oppretter ny person i crew-databasen fra en lønningsliste-rad uten personId,
 * og knytter dem til prosjektcrew (samme som «legg til på prosjekt»).
 */
export async function createPersonForPayrollList(
  projectId: string,
  listId: string,
  input: {
    fullName: string;
    email: string | null;
    mobile: string | null;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    honorar: number | null;
  },
): Promise<{ ok: true; personId: string } | { ok: false; error: string }> {
  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
    select: { id: true, submitted: true },
  });
  if (!list) return { ok: false, error: "Lønningslisten finnes ikke." };
  if (list.submitted) {
    return {
      ok: false,
      error:
        "Innsendte lønningslister kan ikke endres. Dupliser listen for å fortsette.",
    };
  }

  const rawName = input.fullName.trim();
  if (rawName.length < 2) {
    return { ok: false, error: "Fyll inn fullt navn (minst to tegn)." };
  }

  let { first: firstName, last: lastName } = splitNameParts(rawName);
  firstName = firstName.trim();
  lastName = lastName.trim();
  if (!firstName) {
    return { ok: false, error: "Kunne ikke tolke navn (fornavn mangler)." };
  }
  if (!lastName) {
    lastName = "–";
  }

  const emailRaw = input.email?.trim() || "";
  if (!emailRaw) {
    return { ok: false, error: "E-post mangler." };
  }
  const emailOk = z.string().email().safeParse(emailRaw);
  if (!emailOk.success) {
    return { ok: false, error: "Ugyldig e-postadresse." };
  }
  const email = emailRaw;

  const fullName = computeFullName(firstName, lastName);

  if (email) {
    const dupE = await prisma.person.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (dupE) {
      return {
        ok: false,
        error:
          "En person med denne e-posten finnes allerede. Bruk «Søk i database» for å koble raden.",
      };
    }
  }

  const dupName = await prisma.person.findFirst({
    where: { fullName: { equals: fullName, mode: "insensitive" } },
    select: { id: true },
  });
  if (dupName) {
    return {
      ok: false,
      error:
        "En person med dette navnet finnes allerede. Bruk «Søk i database» for å koble raden.",
    };
  }

  const phoneFormatted = formatNorwegianMobileFromRaw(input.mobile);
  if (!phoneFormatted) {
    return {
      ok: false,
      error:
        "Mobil må være nøyaktig 8 siffer (f.eks. 412 34 567).",
    };
  }
  const addressLine = input.addressLine?.trim() || null;
  const postalCode = input.postalCode?.trim() || null;
  const city = input.city?.trim() || null;
  const country = input.country?.trim() || null;
  if (!addressLine || !postalCode || !city) {
    return {
      ok: false,
      error:
        "Adresse (gate), postnummer og poststed må være utfylt (samme som på lønningsraden).",
    };
  }
  const honorar =
    input.honorar != null && !Number.isNaN(input.honorar)
      ? input.honorar
      : null;
  if (honorar == null) {
    return { ok: false, error: "Honorar mangler." };
  }

  const person = await prisma.person.create({
    data: {
      firstName,
      lastName,
      fullName,
      email,
      phone: phoneFormatted,
      addressLine,
      postalCode,
      city,
      country,
      roles: [],
      defaultRate: honorar,
      rateType: "day",
      dietaryPreference: "none",
      isActive: true,
    },
  });

  await addPersonToProject(projectId, person.id, {
    rateOverride: honorar,
    rateTypeOverride: "day",
  });

  revalidatePath("/crew");
  revalidatePayrollPaths(projectId, listId);

  return { ok: true, personId: person.id };
}

/** Søk i crew-databasen; utelater personer som allerede ligger på denne lønningslisten. */
export async function searchPeopleForPayroll(
  projectId: string,
  listId: string,
  q: string,
  limit = 12,
) {
  const list = await prisma.payrollList.findFirst({
    where: { id: listId, projectId },
    select: { id: true },
  });
  if (!list) return [];

  const onPayroll = await prisma.payrollRow.findMany({
    where: { payrollListId: list.id, personId: { not: null } },
    select: { personId: true },
  });
  const exclude = new Set(
    onPayroll.map((r) => r.personId).filter(Boolean) as string[],
  );

  const all = await prisma.person.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? all.filter((p) => {
        if (exclude.has(p.id)) return false;
        const hay = [
          p.firstName,
          p.lastName,
          p.fullName,
          p.email,
          p.phone,
          p.addressLine,
          p.postalCode,
          p.city,
          p.country,
          ...p.roles,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          hay.includes(needle) ||
          p.roles.some((r) => r.toLowerCase().includes(needle))
        );
      })
    : all.filter((p) => !exclude.has(p.id));

  return filtered.slice(0, limit).map(serializePersonForClient);
}
