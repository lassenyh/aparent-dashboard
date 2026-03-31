"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeFullName } from "@/lib/person";

const personSchema = z.object({
  firstName: z.string().min(1, "Fornavn er påkrevd"),
  lastName: z.string().min(1, "Etternavn er påkrevd"),
  email: z
    .string()
    .optional()
    .refine((val) => !val?.trim() || z.string().email().safeParse(val).success, {
      message: "Ugyldig e-post",
    }),
  phone: z.string().optional(),
  addressLine: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  roles: z.array(z.string().min(1)).default([]),
  defaultRate: z.coerce.number().optional().nullable(),
  rateType: z.enum(["day", "hour"]),
  dietaryPreference: z.enum(["none", "vegetarian", "vegan"]),
  allergies: z.string().optional(),
  isActive: z.boolean(),
});

export type CrewListParams = {
  q?: string;
  role?: string;
  city?: string;
  active?: "all" | "active" | "inactive";
  sort?: "lastUsed" | "name";
};

export async function getCrewFilterOptions() {
  const people = await prisma.person.findMany({
    select: { city: true, roles: true },
  });
  const cities = new Set<string>();
  const roles = new Set<string>();
  for (const p of people) {
    if (p.city?.trim()) cities.add(p.city.trim());
    for (const r of p.roles) {
      if (r.trim()) roles.add(r.trim());
    }
  }
  return {
    cities: [...cities].sort((a, b) => a.localeCompare(b, "nb")),
    roles: [...roles].sort((a, b) => a.localeCompare(b, "nb")),
  };
}

export async function getCrewList(params: CrewListParams = {}) {
  const where: Prisma.PersonWhereInput = {};
  if (params.active === "active") where.isActive = true;
  if (params.active === "inactive") where.isActive = false;
  if (params.city) {
    where.city = { equals: params.city, mode: "insensitive" };
  }
  if (params.role) {
    where.roles = { has: params.role };
  }

  const orderBy: Prisma.PersonOrderByWithRelationInput[] =
    params.sort === "name"
      ? [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }]
      : [{ lastUsedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }];

  let people = await prisma.person.findMany({ where, orderBy });

  const q = params.q?.trim().toLowerCase();
  if (q) {
    people = people.filter((p) => {
      const blob = [
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
      return blob.includes(q);
    });
  }

  return people;
}

export async function getPersonById(id: string) {
  return prisma.person.findUnique({
    where: { id },
    include: {
      projectCrews: {
        where: { isActive: true },
        include: {
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function createPerson(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    roles: String(formData.get("roles") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    defaultRate: formData.get("defaultRate")
      ? Number(formData.get("defaultRate"))
      : null,
    dietaryPreference:
      formData.get("dietaryPreference") === "vegetarian"
        ? "vegetarian"
        : formData.get("dietaryPreference") === "vegan"
          ? "vegan"
          : "none",
    allergies: String(formData.get("allergies") ?? ""),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = personSchema.safeParse({ ...raw, rateType: "day" as const });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }

  const d = parsed.data;
  const fullName = computeFullName(d.firstName, d.lastName);

  const person = await prisma.person.create({
    data: {
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      fullName,
      email: d.email?.trim() || null,
      phone: d.phone || null,
      addressLine: d.addressLine?.trim() || null,
      postalCode: d.postalCode?.trim() || null,
      city: d.city || null,
      country: d.country?.trim() || null,
      roles: d.roles,
      defaultRate: d.defaultRate ?? null,
      rateType: d.rateType,
      dietaryPreference: d.dietaryPreference,
      allergies: d.allergies || null,
      isActive: d.isActive,
    },
  });

  revalidatePath("/crew");
  redirect(`/crew/${person.id}`);
}

export async function updatePerson(
  id: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    roles: String(formData.get("roles") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    defaultRate: formData.get("defaultRate")
      ? Number(formData.get("defaultRate"))
      : null,
    dietaryPreference:
      formData.get("dietaryPreference") === "vegetarian"
        ? "vegetarian"
        : formData.get("dietaryPreference") === "vegan"
          ? "vegan"
          : "none",
    allergies: String(formData.get("allergies") ?? ""),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = personSchema.safeParse({ ...raw, rateType: "day" as const });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }

  const d = parsed.data;
  const fullName = computeFullName(d.firstName, d.lastName);

  const data: Parameters<typeof prisma.person.update>[0]["data"] = {
    firstName: d.firstName.trim(),
    lastName: d.lastName.trim(),
    fullName,
    email: d.email?.trim() || null,
    phone: d.phone || null,
    addressLine: d.addressLine?.trim() || null,
    postalCode: d.postalCode?.trim() || null,
    city: d.city || null,
    country: d.country?.trim() || null,
    roles: d.roles,
    defaultRate: d.defaultRate ?? null,
    rateType: d.rateType,
    dietaryPreference: d.dietaryPreference,
    allergies: d.allergies || null,
    isActive: d.isActive,
  };

  if (formData.has("internalStarRating")) {
    const internalStarRatingRaw = formData.get("internalStarRating");
    let internalStarRating: number | null = null;
    if (
      internalStarRatingRaw != null &&
      String(internalStarRatingRaw).trim() !== ""
    ) {
      const n = Number(internalStarRatingRaw);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return { error: "Intern vurdering må være 1–5 stjerner" };
      }
      internalStarRating = n;
    }
    data.internalStarRating = internalStarRating;
  }

  await prisma.person.update({
    where: { id },
    data,
  });

  revalidatePath("/crew");
  revalidatePath(`/crew/${id}`);
  return null;
}

export async function touchPersonLastUsed(personId: string) {
  await prisma.person.update({
    where: { id: personId },
    data: { lastUsedAt: new Date() },
  });
}

/** Sletter personen fra databasen. Call sheet-rader med denne personen fjernes (Restrict-FK). */
export async function deletePerson(personId: string, formData?: FormData) {
  const exists = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true },
  });
  if (!exists) return;

  await prisma.$transaction(async (tx) => {
    await tx.callSheetCrew.deleteMany({ where: { personId } });
    await tx.person.delete({ where: { id: personId } });
  });

  revalidatePath("/crew");
  revalidatePath("/", "layout");
  revalidatePath("/callsheets", "layout");

  const rawReturn = formData?.get("returnTo");
  const redirectTo =
    typeof rawReturn === "string" &&
    (rawReturn === "/crew" || rawReturn.startsWith("/crew?"))
      ? rawReturn
      : "/crew";
  redirect(redirectTo);
}
