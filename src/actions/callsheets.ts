"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  assertPermission,
  getProjectAccessForUser,
  requireProjectAccess,
} from "@/lib/project-access";
import { touchPersonLastUsed } from "@/actions/crew";
import { ensureProjectCrewList } from "@/actions/project-crew-list";
import { buildCallSheetSnapshotData } from "@/lib/snapshot";

const sheetSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  date: z.string().min(1, "Dato er påkrevd"),
  location: z.string().optional(),
  generalCallTime: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "final"]),
});

function parseDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

/** Legger inn snapshot-rader fra prosjektets standard crewliste (rekkefølge som i listen). */
async function addDefaultCrewListToCallSheet(callSheetId: string) {
  const sheet = await prisma.callSheet.findUnique({
    where: { id: callSheetId },
    select: { projectId: true },
  });
  if (!sheet) return;

  await ensureProjectCrewList(sheet.projectId);

  const list = await prisma.projectCrewList.findUnique({
    where: { projectId: sheet.projectId },
    include: {
      members: {
        orderBy: { sortOrder: "asc" },
        include: {
          projectCrew: { include: { person: true } },
        },
      },
    },
  });
  if (!list?.members.length) return;

  const existing = await prisma.callSheetCrew.findMany({
    where: { callSheetId },
    select: { personId: true },
  });
  const exclude = new Set(existing.map((r) => r.personId));

  let nextOrder =
    (
      await prisma.callSheetCrew.aggregate({
        where: { callSheetId },
        _max: { sortOrder: true },
      })
    )._max.sortOrder ?? -1;

  for (const m of list.members) {
    const pc = m.projectCrew;
    if (!pc.isActive) continue;
    if (exclude.has(pc.personId)) continue;
    nextOrder += 1;
    const snap = buildCallSheetSnapshotData(pc);
    await prisma.callSheetCrew.create({
      data: {
        callSheetId,
        personId: pc.personId,
        ...snap,
        sortOrder: nextOrder,
      },
    });
    await touchPersonLastUsed(pc.personId);
    exclude.add(pc.personId);
  }
}

export async function getAvailableProjectCrewForCallSheet(callSheetId: string) {
  const sheet = await prisma.callSheet.findUnique({
    where: { id: callSheetId },
    select: { projectId: true },
  });
  if (!sheet) return [];

  const { flags } = await requireProjectAccess(sheet.projectId);
  assertPermission(flags, "canEditCallSheets");

  const onSheet = await prisma.callSheetCrew.findMany({
    where: { callSheetId },
    select: { personId: true },
  });
  const exclude = new Set(onSheet.map((r) => r.personId));

  const all = await prisma.projectCrew.findMany({
    where: { projectId: sheet.projectId, isActive: true },
    include: { person: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return all.filter((pc) => !exclude.has(pc.personId));
}

export async function getCallSheetById(id: string) {
  const sessionUser = await getSessionDashboardUser();
  if (!sessionUser) notFound();

  const sheet = await prisma.callSheet.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!sheet) return null;
  const flags = await getProjectAccessForUser(sessionUser, sheet.projectId);
  if (!flags?.canViewCallSheets) notFound();

  return prisma.callSheet.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          agency: true,
          customer: true,
        },
      },
      crew: {
        include: { person: { select: { id: true, isActive: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function createCallSheet(
  projectId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    date: String(formData.get("date") ?? ""),
    location: String(formData.get("location") ?? ""),
    generalCallTime: String(formData.get("generalCallTime") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    status: formData.get("status") === "final" ? "final" : ("draft" as const),
  };

  const parsed = sheetSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }

  const d = parsed.data;

  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canEditCallSheets");

  const sheet = await prisma.callSheet.create({
    data: {
      projectId,
      name: d.name.trim(),
      date: parseDate(d.date),
      location: d.location || null,
      generalCallTime: d.generalCallTime || null,
      notes: d.notes || null,
      status: d.status,
    },
  });

  await addDefaultCrewListToCallSheet(sheet.id);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  redirect(`/callsheets/${sheet.id}`);
}

export async function updateCallSheet(
  id: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const existing = await prisma.callSheet.findUnique({ where: { id } });
  if (!existing) return { error: "Call sheet ikke funnet" };

  const { flags } = await requireProjectAccess(existing.projectId);
  assertPermission(flags, "canEditCallSheets");

  const raw = {
    name: String(formData.get("name") ?? ""),
    date: String(formData.get("date") ?? ""),
    location: String(formData.get("location") ?? ""),
    generalCallTime: String(formData.get("generalCallTime") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    status: formData.get("status") === "final" ? "final" : ("draft" as const),
  };

  const parsed = sheetSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }

  const d = parsed.data;
  await prisma.callSheet.update({
    where: { id },
    data: {
      name: d.name.trim(),
      date: parseDate(d.date),
      location: d.location || null,
      generalCallTime: d.generalCallTime || null,
      notes: d.notes || null,
      status: d.status,
    },
  });

  revalidatePath(`/callsheets/${id}`);
  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath("/");
  return null;
}

export async function deleteCallSheet(id: string, _formData?: FormData) {
  void _formData;
  const sheet = await prisma.callSheet.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!sheet) return;

  const { flags } = await requireProjectAccess(sheet.projectId);
  assertPermission(flags, "canEditCallSheets");

  await prisma.callSheet.delete({ where: { id } });
  revalidatePath(`/projects/${sheet.projectId}`);
  revalidatePath("/");
  redirect(`/projects/${sheet.projectId}`);
}

export async function addProjectCrewToCallSheet(
  callSheetId: string,
  projectCrewId: string,
) {
  const sheet = await prisma.callSheet.findUnique({
    where: { id: callSheetId },
  });
  if (!sheet) throw new Error("Call sheet ikke funnet");

  const { flags } = await requireProjectAccess(sheet.projectId);
  assertPermission(flags, "canEditCallSheets");

  const pc = await prisma.projectCrew.findFirst({
    where: {
      id: projectCrewId,
      projectId: sheet.projectId,
      isActive: true,
    },
    include: { person: true },
  });
  if (!pc) throw new Error("Prosjektcrew ikke funnet");

  const dup = await prisma.callSheetCrew.findFirst({
    where: { callSheetId, personId: pc.personId },
  });
  if (dup) {
    return { error: "Personen er allerede på denne call sheet" };
  }

  const snap = buildCallSheetSnapshotData(pc);
  const max = await prisma.callSheetCrew.aggregate({
    where: { callSheetId },
    _max: { sortOrder: true },
  });

  await prisma.callSheetCrew.create({
    data: {
      callSheetId,
      personId: pc.personId,
      ...snap,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });

  await touchPersonLastUsed(pc.personId);
  revalidatePath(`/callsheets/${callSheetId}`);
  revalidatePath(`/projects/${sheet.projectId}`);
  return { ok: true };
}

export async function updateCallSheetCrewRow(
  rowId: string,
  data: {
    callTime?: string | null;
    pickupInfo?: string | null;
    notes?: string | null;
    roleSnapshot?: string;
  },
) {
  const existing = await prisma.callSheetCrew.findUnique({
    where: { id: rowId },
    include: { callSheet: { select: { projectId: true } } },
  });
  if (!existing) return { ok: false as const };
  const { flags } = await requireProjectAccess(existing.callSheet.projectId);
  assertPermission(flags, "canEditCallSheets");

  const row = await prisma.callSheetCrew.update({
    where: { id: rowId },
    data: {
      ...(data.callTime !== undefined && {
        callTime: data.callTime === "" ? null : data.callTime,
      }),
      ...(data.pickupInfo !== undefined && {
        pickupInfo: data.pickupInfo === "" ? null : data.pickupInfo,
      }),
      ...(data.notes !== undefined && {
        notes: data.notes === "" ? null : data.notes,
      }),
      ...(data.roleSnapshot !== undefined && {
        roleSnapshot: data.roleSnapshot,
      }),
    },
  });

  revalidatePath(`/callsheets/${row.callSheetId}`);
  return { ok: true };
}

export async function removeCallSheetCrewRow(rowId: string) {
  const row = await prisma.callSheetCrew.findUnique({
    where: { id: rowId },
    include: { callSheet: { select: { projectId: true } } },
  });
  if (!row) return;

  const { flags } = await requireProjectAccess(row.callSheet.projectId);
  assertPermission(flags, "canEditCallSheets");

  await prisma.callSheetCrew.delete({ where: { id: rowId } });
  revalidatePath(`/callsheets/${row.callSheetId}`);
  revalidatePath(`/projects/${row.callSheet.projectId}`);
}

export async function reorderCallSheetCrew(
  callSheetId: string,
  orderedIds: string[],
) {
  const sheet = await prisma.callSheet.findUnique({
    where: { id: callSheetId },
    select: { projectId: true },
  });
  if (!sheet) return;
  const { flags } = await requireProjectAccess(sheet.projectId);
  assertPermission(flags, "canEditCallSheets");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.callSheetCrew.update({
        where: { id, callSheetId },
        data: { sortOrder: index },
      }),
    ),
  );
  revalidatePath(`/callsheets/${callSheetId}`);
}

export async function duplicateCallSheet(callSheetId: string) {
  const original = await prisma.callSheet.findUnique({
    where: { id: callSheetId },
    include: {
      crew: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!original) throw new Error("Call sheet ikke funnet");

  const { flags } = await requireProjectAccess(original.projectId);
  assertPermission(flags, "canEditCallSheets");

  const newName = `${original.name} Copy`;

  const created = await prisma.$transaction(async (tx) => {
    const sheet = await tx.callSheet.create({
      data: {
        projectId: original.projectId,
        name: newName,
        date: original.date,
        location: original.location,
        generalCallTime: original.generalCallTime,
        notes: original.notes,
        status: "draft",
      },
    });

    for (const row of original.crew) {
      await tx.callSheetCrew.create({
        data: {
          callSheetId: sheet.id,
          personId: row.personId,
          fullNameSnapshot: row.fullNameSnapshot,
          roleSnapshot: row.roleSnapshot,
          phoneSnapshot: row.phoneSnapshot,
          emailSnapshot: row.emailSnapshot,
          dietaryPreferenceSnapshot: row.dietaryPreferenceSnapshot,
          allergiesSnapshot: row.allergiesSnapshot,
          rateSnapshot: row.rateSnapshot,
          rateTypeSnapshot: row.rateTypeSnapshot,
          callTime: row.callTime,
          pickupInfo: row.pickupInfo,
          notes: row.notes,
          sortOrder: row.sortOrder,
        },
      });
    }

    return sheet;
  });

  revalidatePath(`/projects/${original.projectId}`);
  revalidatePath("/");
  redirect(`/callsheets/${created.id}`);
}
