"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

async function bumpProjectCrewListTimestamp(projectId: string) {
  await prisma.projectCrewList.updateMany({
    where: { projectId },
    data: { updatedAt: new Date() },
  });
}

export async function ensureProjectCrewList(projectId: string) {
  return prisma.projectCrewList.upsert({
    where: { projectId },
    create: { projectId },
    update: {},
  });
}

/** Legger inn aktive prosjektcrew som mangler i standardlisten (respekterer excludedFromDefaultCrewList). */
export async function syncMissingProjectCrewIntoDefaultList(projectId: string) {
  const list = await ensureProjectCrewList(projectId);
  const members = await prisma.projectCrewListMember.findMany({
    where: { projectCrewListId: list.id },
    select: { projectCrewId: true },
  });
  const inList = new Set(members.map((m) => m.projectCrewId));
  const candidates = await prisma.projectCrew.findMany({
    where: {
      projectId,
      isActive: true,
      excludedFromDefaultCrewList: false,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const missing = candidates.filter((pc) => !inList.has(pc.id));
  if (missing.length === 0) return;

  const max = await prisma.projectCrewListMember.aggregate({
    where: { projectCrewListId: list.id },
    _max: { sortOrder: true },
  });
  let next = max._max.sortOrder ?? -1;

  await prisma.$transaction(async (tx) => {
    for (const pc of missing) {
      next += 1;
      await tx.projectCrewListMember.create({
        data: {
          projectCrewListId: list.id,
          projectCrewId: pc.id,
          sortOrder: next,
        },
      });
    }
  });

  await bumpProjectCrewListTimestamp(projectId);

  // Ikke kall revalidatePath her: denne funksjonen kjører under RSC-render (crewliste-side).
  // Neste forespørsel får oppdatert data uansett; revalidatePath hører til server actions.
}

export async function getProjectCrewListPageData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, internalTitle: true },
  });
  if (!project) return null;

  await ensureProjectCrewList(projectId);

  const list = await prisma.projectCrewList.findUniqueOrThrow({
    where: { projectId },
    include: {
      members: {
        orderBy: { sortOrder: "asc" },
        include: {
          projectCrew: { include: { person: true } },
        },
      },
    },
  });

  const allProjectCrew = await prisma.projectCrew.findMany({
    where: { projectId, isActive: true },
    include: { person: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const inList = new Set(list.members.map((m) => m.projectCrewId));
  const availableToAdd = allProjectCrew.filter((pc) => !inList.has(pc.id));

  return {
    project,
    listId: list.id,
    crewListUpdatedAt: list.updatedAt,
    members: list.members,
    availableToAdd,
  };
}

export async function getProjectIdByCrewListShareToken(
  token: string,
): Promise<string | null> {
  const row = await prisma.projectCrewListShare.findUnique({
    where: { token },
    select: { projectId: true },
  });
  return row?.projectId ?? null;
}

export async function getCrewListShareForProject(projectId: string) {
  return prisma.projectCrewListShare.findUnique({
    where: { projectId },
    select: { token: true, createdAt: true },
  });
}

export async function ensureCrewListShare(projectId: string) {
  const row = await prisma.projectCrewListShare.upsert({
    where: { projectId },
    create: { projectId, token: newShareToken() },
    update: {},
  });
  revalidatePath(`/projects/${projectId}/crewliste`);
  return row;
}

export async function rotateCrewListShareToken(projectId: string) {
  const token = newShareToken();
  await prisma.projectCrewListShare.upsert({
    where: { projectId },
    create: { projectId, token },
    update: { token },
  });
  revalidatePath(`/projects/${projectId}/crewliste`);
}

export async function addProjectCrewToDefaultList(
  projectId: string,
  projectCrewId: string,
) {
  const list = await ensureProjectCrewList(projectId);

  const pc = await prisma.projectCrew.findFirst({
    where: {
      id: projectCrewId,
      projectId,
      isActive: true,
    },
  });
  if (!pc) throw new Error("Prosjektcrew ikke funnet");

  if (pc.excludedFromDefaultCrewList) {
    await prisma.projectCrew.update({
      where: { id: pc.id },
      data: { excludedFromDefaultCrewList: false },
    });
  }

  const dup = await prisma.projectCrewListMember.findFirst({
    where: { projectCrewListId: list.id, projectCrewId },
  });
  if (dup) return;

  const max = await prisma.projectCrewListMember.aggregate({
    where: { projectCrewListId: list.id },
    _max: { sortOrder: true },
  });

  await prisma.projectCrewListMember.create({
    data: {
      projectCrewListId: list.id,
      projectCrewId,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });

  await bumpProjectCrewListTimestamp(projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/crewliste`);
}

export async function removeProjectCrewListMember(memberId: string) {
  const row = await prisma.projectCrewListMember.findUnique({
    where: { id: memberId },
    include: {
      projectCrewList: { select: { projectId: true } },
      projectCrew: { select: { id: true } },
    },
  });
  if (!row) return;
  const projectId = row.projectCrewList.projectId;
  await prisma.projectCrewListMember.delete({ where: { id: memberId } });
  await prisma.projectCrew.update({
    where: { id: row.projectCrew.id },
    data: { excludedFromDefaultCrewList: true },
  });
  await bumpProjectCrewListTimestamp(projectId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/crewliste`);
}

export async function moveProjectCrewListMember(
  projectId: string,
  memberId: string,
  direction: "up" | "down",
) {
  const list = await prisma.projectCrewList.findUnique({
    where: { projectId },
    include: {
      members: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!list?.members.length) return;

  const idx = list.members.findIndex((m) => m.id === memberId);
  if (idx < 0) return;
  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= list.members.length) return;

  const a = list.members[idx];
  const b = list.members[j];
  await prisma.$transaction([
    prisma.projectCrewListMember.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.projectCrewListMember.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);

  await bumpProjectCrewListTimestamp(projectId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/crewliste`);
}
