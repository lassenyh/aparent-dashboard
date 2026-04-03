"use server";

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
import {
  addProjectCrewToDefaultList,
  ensureProjectCrewList,
} from "@/actions/project-crew-list";

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

export async function getProjectById(id: string) {
  const sessionUser = await getSessionDashboardUser();
  if (!sessionUser) notFound();
  const flags = await getProjectAccessForUser(sessionUser, id);
  if (!flags) notFound();

  return prisma.project.findUnique({
    where: { id },
    include: {
      agency: true,
      customer: true,
      crew: {
        where: { isActive: true },
        include: { person: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      ...(FEATURE_CALL_SHEETS_UI
        ? {
            callSheets: {
              orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
            },
          }
        : {}),
      dagsplaner: {
        orderBy: [{ shootDate: "desc" }, { updatedAt: "desc" }],
      },
      payrollLists: {
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

  const p = await prisma.project.create({
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

  await ensureProjectCrewList(p.id);

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

  await prisma.project.update({
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

async function linkPersonToProjectCrew(
  projectId: string,
  personId: string,
  opts?: {
    roleOverride?: string | null;
    rateOverride?: number | null;
    rateTypeOverride?: "day" | "hour" | null;
  },
) {
  const existing = await prisma.projectCrew.findUnique({
    where: { projectId_personId: { projectId, personId } },
  });

  let projectCrewId: string;

  if (existing) {
    const updated = await prisma.projectCrew.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        excludedFromDefaultCrewList: false,
        roleOverride: opts?.roleOverride ?? undefined,
        rateOverride: opts?.rateOverride ?? undefined,
        rateTypeOverride: opts?.rateTypeOverride ?? undefined,
      },
    });
    projectCrewId = updated.id;
  } else {
    const max = await prisma.projectCrew.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const created = await prisma.projectCrew.create({
      data: {
        projectId,
        personId,
        roleOverride: opts?.roleOverride ?? null,
        rateOverride: opts?.rateOverride ?? null,
        rateTypeOverride: opts?.rateTypeOverride ?? null,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
    projectCrewId = created.id;
  }

  await touchPersonLastUsed(personId);
  await addProjectCrewToDefaultList(projectId, projectCrewId);
  revalidatePath(`/projects/${projectId}`);
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
        data.rateOverride === undefined ? undefined : data.rateOverride,
      rateTypeOverride:
        data.rateTypeOverride === undefined ? undefined : data.rateTypeOverride,
      notes: data.notes === undefined ? undefined : data.notes,
      sortOrder: data.sortOrder === undefined ? undefined : data.sortOrder,
      isActive: data.isActive,
    },
  });
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
  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canEditCrew");

  const assigned = await prisma.projectCrew.findMany({
    where: { projectId, isActive: true },
    select: { personId: true },
  });
  const exclude = new Set(assigned.map((a) => a.personId));

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
