"use server";

import { redactProjectCrew } from "@/lib/project-data-access";
import { isLeadRole, isProducerRole } from "@/lib/project-leads";
import { syncProjectLeads } from "@/lib/sync-project-leads";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  assertPermission,
  getAccessibleProjectIds,
  getProjectAccessForUser,
  requireInternalUser,
  requireProjectAccess,
  requireProjectAccessByProjectCrewId,
} from "@/lib/project-access";
import { projectListSortKey } from "@/lib/utils";
import { serializePersonForClient } from "@/lib/serialize";
import { touchPersonLastUsed } from "@/actions/crew";

const projectSchema = z.object({
  name: z.string().min(1, "Prosjektnavn er påkrevd"),
  internalTitle: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["active", "archived"]),
  agencyId: z.string().optional(),
  customerId: z.string().optional(),
});

function optionalRelationId(raw: string): string | null {
  const t = raw.trim();
  return t || null;
}

function parseOptionalDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getProjectsList() {
  const sessionUser = await getSessionDashboardUser();
  if (!sessionUser) return [];
  const accessibleIds = await getAccessibleProjectIds(sessionUser);
  if (accessibleIds !== null && accessibleIds.length === 0) {
    return [];
  }

  const rows = await prisma.project.findMany({
    where: accessibleIds === null ? undefined : { id: { in: accessibleIds } },
    include: {
      _count: {
        select: {
          crew: true,
          ...(FEATURE_CALL_SHEETS_UI ? { callSheets: true } : {}),
        },
      },
      customer: { select: { name: true, logoUrl: true } },
      agency: { select: { name: true, logoUrl: true } },
    },
  });
  return [...rows].sort((a, b) =>
    projectListSortKey(a).localeCompare(projectListSortKey(b), "nb", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export type ProjectSections = {
  crew?: boolean;
  dagsplaner?: boolean;
  payrollLists?: boolean;
  callSheets?: boolean;
};

/**
 * Prosjekt med relasjoner. `sections` lar en side hente kun det den viser
 * (utelatte relasjoner returneres som tomme lister). Standard: alt.
 */
export async function getProjectById(id: string, sections: ProjectSections = {}) {
  const want = {
    crew: sections.crew ?? true,
    dagsplaner: sections.dagsplaner ?? true,
    payrollLists: sections.payrollLists ?? true,
    callSheets: (sections.callSheets ?? true) && FEATURE_CALL_SHEETS_UI,
  };
  const sessionUser = await getSessionDashboardUser();
  if (!sessionUser) notFound();
  const flags = await getProjectAccessForUser(sessionUser, id);
  if (!flags) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      agency: true,
      customer: true,
      crew: {
        where: want.crew && flags.canViewCrew ? { isActive: true } : { id: { in: [] } },
        include: { person: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      callSheets: {
        where: want.callSheets && flags.canViewCallSheets ? undefined : { id: { in: [] } },
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      },
      dagsplaner: {
        where: want.dagsplaner && flags.canViewDagsplan ? undefined : { id: { in: [] } },
        orderBy: [{ shootDate: "desc" }, { updatedAt: "desc" }],
      },
      payrollLists: {
        where: want.payrollLists && flags.canViewPayroll ? undefined : { id: { in: [] } },
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          submitted: true,
          updatedAt: true,
          _count: { select: { rows: true } },
        },
      },
    },
  });
  if (!project) return null;
  return { ...project,
    crew: project.crew.map(row => redactProjectCrew(row, flags)),
  };
}

export async function getProjectLeadOptions() {
  await requireInternalUser();
  return prisma.person.findMany({ where: { isActive: true }, select: { id: true, fullName: true, roles: true }, orderBy: { fullName: "asc" } });
}

async function validateLeadSelection(formData: FormData) {
  const producerId = String(formData.get("producerId") ?? "").trim();
  const directorId = String(formData.get("directorId") ?? "").trim();
  const ids = [...new Set([producerId, directorId].filter(Boolean))];
  const people = await prisma.person.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, roles: true } });
  const producer = people.find((person) => person.id === producerId);
  const director = people.find((person) => person.id === directorId);
  return { producerId, directorId, valid: people.length === ids.length &&
    (!producerId || !!producer?.roles.some(isProducerRole)) &&
    (!directorId || !!director?.roles.some((role) => isLeadRole(role, "director"))) };

}

export async function createProject(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    internalTitle: String(formData.get("internalTitle") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    status:
      formData.get("status") === "archived" ? "archived" : ("active" as const),
    agencyId: String(formData.get("agencyId") ?? ""),
    customerId: String(formData.get("customerId") ?? ""),
  };

  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }

  const d = parsed.data;
  await requireInternalUser();

  const leads = await validateLeadSelection(formData);
  if (!leads.valid) return { error: "Velg en aktiv produsent/linjeprodusent og regissør med riktig rolle i crewregisteret." };
  const p = await prisma.$transaction(async (tx) => {
  const created = await tx.project.create({
    data: {
      name: d.name.trim(),
      internalTitle: d.internalTitle || null,
      startDate: parseOptionalDate(d.startDate ?? ""),
      endDate: parseOptionalDate(d.endDate ?? ""),
      status: d.status,
      agencyId: optionalRelationId(d.agencyId ?? ""),
      customerId: optionalRelationId(d.customerId ?? ""),
    },
  });

  await syncProjectLeads(tx, created.id, leads.producerId, leads.directorId);
  return created;
  });

  revalidatePath("/");
  redirect(`/projects/${p.id}`);
}

export async function updateProject(
  id: string,
  _prev: { error?: string } | { success: true } | null,
  formData: FormData,
): Promise<{ error?: string } | { success: true }> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    internalTitle: String(formData.get("internalTitle") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    status:
      formData.get("status") === "archived" ? "archived" : ("active" as const),
    agencyId: String(formData.get("agencyId") ?? ""),
    customerId: String(formData.get("customerId") ?? ""),
  };

  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }

  const d = parsed.data;
  const { flags } = await requireProjectAccess(id);
  assertPermission(flags, "canEditProjectInfo");

  const updateLeads = formData.has("producerId") && formData.has("directorId");
  if (updateLeads) assertPermission(flags, "canEditCrew");
  const leads = updateLeads ? await validateLeadSelection(formData) : null;
  if (leads && !leads.valid) return { error: "Velg en aktiv produsent/linjeprodusent og regissør med riktig rolle i crewregisteret." };
  await prisma.$transaction(async (tx) => {
  await tx.project.update({
    where: { id },
    data: {
      name: d.name.trim(),
      internalTitle: d.internalTitle || null,
      startDate: parseOptionalDate(d.startDate ?? ""),
      endDate: parseOptionalDate(d.endDate ?? ""),
      status: d.status,
      agencyId: optionalRelationId(d.agencyId ?? ""),
      customerId: optionalRelationId(d.customerId ?? ""),
    },
  });

  if (leads?.valid) await syncProjectLeads(tx, id, leads.producerId, leads.directorId);
  });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteProject(projectId: string, _formData?: FormData) {
  void _formData;
  await requireInternalUser();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/");
  redirect("/");
}

/**
 * Kobler person til prosjektet og legger den i standard crewliste.
 * Tilgang må være sjekket av kaller. Uavhengige spørringer kjøres parallelt
 * (3 DB-rundturer totalt i stedet for ~15 sekvensielle).
 */
async function linkPersonToProjectCrew(
  projectId: string,
  personId: string,
  opts?: {
    roleOverride?: string | null;
    rateOverride?: number | null;
    rateTypeOverride?: "day" | "hour" | null;
  },
) {
  const now = new Date();
  const [existing, list, crewMax, memberMax] = await Promise.all([
    prisma.projectCrew.findUnique({
      where: { projectId_personId: { projectId, personId } },
      select: { id: true },
    }),
    prisma.projectCrewList.upsert({
      where: { projectId },
      create: { projectId },
      update: { updatedAt: now },
      select: { id: true },
    }),
    prisma.projectCrew.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    }),
    prisma.projectCrewListMember.aggregate({
      where: { projectCrewList: { projectId } },
      _max: { sortOrder: true },
    }),
    touchPersonLastUsed(personId),
  ]);

  const projectCrew = existing
    ? await prisma.projectCrew.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          excludedFromDefaultCrewList: false,
          roleOverride: opts?.roleOverride ?? undefined,
          rateOverride: opts?.rateOverride ?? undefined,
          rateTypeOverride: opts?.rateTypeOverride ?? undefined,
        },
        select: { id: true },
      })
    : await prisma.projectCrew.create({
        data: {
          projectId,
          personId,
          roleOverride: opts?.roleOverride ?? null,
          rateOverride: opts?.rateOverride ?? null,
          rateTypeOverride: opts?.rateTypeOverride ?? null,
          sortOrder: (crewMax._max.sortOrder ?? 0) + 1,
        },
        select: { id: true },
      });

  // skipDuplicates: allerede i lista (unik på liste + prosjektcrew) → ingen endring.
  await prisma.projectCrewListMember.createMany({
    data: {
      projectCrewListId: list.id,
      projectCrewId: projectCrew.id,
      sortOrder: (memberMax._max.sortOrder ?? -1) + 1,
    },
    skipDuplicates: true,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/crewliste`);
  revalidatePath("/");
}

export async function addPersonToProject(
  projectId: string,
  personId: string,
  opts?: {
    roleOverride?: string | null;
    rateOverride?: number | null;
    rateTypeOverride?: "day" | "hour" | null;
  },
) {
  const user = await getSessionDashboardUser();
  if (!user) notFound();
  const flags = await getProjectAccessForUser(user, projectId);
  if (!flags) notFound();
  if (!user.isInternal && !flags.canEditCrew) notFound();
  if (!user.isInternal) {
    const linked = await prisma.projectCrew.findUnique({ where: { projectId_personId: { projectId, personId } } });
    if (!linked) notFound();
  }

  await linkPersonToProjectCrew(projectId, personId, opts);
}

/** Etter import fra PDF/tekst — krever egen rettighet, ikke nødvendigvis `canEditCrew`. */
export async function addPersonToProjectFromImport(
  projectId: string,
  personId: string,
  opts?: {
    roleOverride?: string | null;
    rateOverride?: number | null;
    rateTypeOverride?: "day" | "hour" | null;
  },
) {
  const user = await getSessionDashboardUser();
  if (!user) notFound();
  const flags = await getProjectAccessForUser(user, projectId);
  if (!flags) notFound();
  if (!user.isInternal && !flags.canImportCrewDatabase) notFound();

  await linkPersonToProjectCrew(projectId, personId, opts);
}

export async function submitProjectCrewRow(
  projectCrewId: string,
  formData: FormData,
) {
  const roleOverride = String(formData.get("roleOverride") ?? "").trim();
  const rateRaw = String(formData.get("rateOverride") ?? "").trim();
  const rateTypeRaw = String(formData.get("rateTypeOverride") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  await updateProjectCrew(projectCrewId, {
    roleOverride: roleOverride || null,
    rateOverride: rateRaw ? Number(rateRaw) : null,
    rateTypeOverride:
      rateTypeRaw === "hour"
        ? "hour"
        : rateTypeRaw === "day"
          ? "day"
          : null,
    notes: notes || null,
  });
}

export async function updateProjectCrew(
  projectCrewId: string,
  data: {
    roleOverride?: string | null;
    rateOverride?: number | null;
    rateTypeOverride?: "day" | "hour" | null;
    notes?: string | null;
    sortOrder?: number | null;
    isActive?: boolean;
  },
) {
  const { flags } = await requireProjectAccessByProjectCrewId(projectCrewId);
  assertPermission(flags, "canEditCrew");

  const row = await prisma.projectCrew.update({
    where: { id: projectCrewId },
    data: {
      roleOverride:
        data.roleOverride === undefined ? undefined : data.roleOverride,
      rateOverride:
        !flags.canEditPayroll || data.rateOverride === undefined ? undefined : data.rateOverride,
      rateTypeOverride:
        !flags.canEditPayroll || data.rateTypeOverride === undefined ? undefined : data.rateTypeOverride,
      notes: data.notes === undefined ? undefined : data.notes,
      sortOrder: data.sortOrder === undefined ? undefined : data.sortOrder,
      isActive: data.isActive,
    },
  });
  await prisma.projectCrewList.updateMany({
    where: { projectId: row.projectId },
    data: { updatedAt: new Date() },
  });
  revalidatePath(`/projects/${row.projectId}/crewliste`);
  revalidatePath(`/projects/${row.projectId}/crewliste/print`);
  revalidatePath(`/projects/${row.projectId}`);
}

export async function deactivateProjectCrew(projectCrewId: string) {
  const { flags } = await requireProjectAccessByProjectCrewId(projectCrewId);
  assertPermission(flags, "canEditCrew");

  const row = await prisma.projectCrew.update({
    where: { id: projectCrewId },
    data: { isActive: false },
  });
  await prisma.projectCrewListMember.deleteMany({
    where: { projectCrewId },
  });
  revalidatePath(`/projects/${row.projectId}`);
  revalidatePath(`/projects/${row.projectId}/crewliste`);
}

export async function searchPeopleForProject(
  projectId: string,
  q: string,
  limit = 12,
) {
  const { user, flags } = await requireProjectAccess(projectId);
  if (!user.isInternal) return [];
  assertPermission(flags, "canEditCrew");

  const [assigned, all] = await Promise.all([
    prisma.projectCrew.findMany({
      where: { projectId, isActive: true },
      select: { personId: true },
    }),
    prisma.person.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    }),
  ]);
  const exclude = new Set(assigned.map((a) => a.personId));

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

/** Oppretter person og prosjektkobling samlet, så ingen halvferdig opprettelse blir liggende. */
export async function createPersonForProject(projectId: string, formData: FormData) {
  const { user, flags } = await requireProjectAccess(projectId);
  if (!user.isInternal) notFound();
  assertPermission(flags, "canEditCrew");
  const parsed = z.object({
    firstName: z.string().trim().min(1, "Fornavn er påkrevd"),
    lastName: z.string().trim().min(1, "Etternavn er påkrevd"),
    email: z.union([z.literal(""), z.string().email("Ugyldig e-post")]),
    phone: z.string().trim(),
    roles: z.string().trim(),
    defaultRate: z.union([z.literal(""), z.coerce.number().min(0, "Satsen må være 0 eller høyere")]),
  }).safeParse(Object.fromEntries(["firstName", "lastName", "email", "phone", "roles", "defaultRate"].map((key) => [key, String(formData.get(key) ?? "").trim()])));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontroller feltene." };
  const { firstName, lastName, email, phone, roles, defaultRate } = parsed.data;
  const person = await prisma.$transaction(async (tx) => {
    const person = await tx.person.create({ data: {
      firstName, lastName, fullName: `${firstName} ${lastName}`, email: email || null, phone: phone || null,
      roles: [...new Set(roles.split(",").map((role) => role.trim()).filter(Boolean))],
      defaultRate: defaultRate === "" ? null : defaultRate, rateType: "day", isActive: true, lastUsedAt: new Date(),
    } });
    const max = await tx.projectCrew.aggregate({ where: { projectId }, _max: { sortOrder: true } });
    const crew = await tx.projectCrew.create({ data: { projectId, personId: person.id, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    const list = await tx.projectCrewList.upsert({ where: { projectId }, create: { projectId }, update: { updatedAt: new Date() } });
    const listMax = await tx.projectCrewListMember.aggregate({ where: { projectCrewListId: list.id }, _max: { sortOrder: true } });
    await tx.projectCrewListMember.create({ data: { projectCrewListId: list.id, projectCrewId: crew.id, sortOrder: (listMax._max.sortOrder ?? -1) + 1 } });
    return { id: person.id, fullName: person.fullName };
  });
  revalidatePath("/crew");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/crewliste`);
  return { person };
}

export async function getProjectCrewRoleOptions(projectId: string) {
  const { user, flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canEditCrew");
  const people = await prisma.person.findMany({ where: user.isInternal ? {} : { projectCrews: { some: { projectId } } }, select: { roles: true } });
  return [...new Set(["Regissør", ...people.flatMap((person) => person.roles).map((role) => role.trim()).filter(Boolean)])]
    .sort((a, b) => a.localeCompare(b, "nb"));
}
