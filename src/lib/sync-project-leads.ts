import type { Prisma } from "@/generated/prisma/client";
import { crewRoles, isLeadRole } from "@/lib/project-leads";

/** Called inside the same transaction as the project update. Never deletes crew history. */
export async function syncProjectLeads(tx: Prisma.TransactionClient, projectId: string, producerId: string, directorId: string) {
  const rows = await tx.projectCrew.findMany({ where: { projectId }, include: { person: { select: { roles: true } } } });
  const ids = [...new Set([producerId, directorId].filter(Boolean))];
  const list = await tx.projectCrewList.upsert({ where: { projectId }, create: { projectId }, update: {} });
  let sortOrder = Math.max(0, ...rows.map((row) => row.sortOrder ?? 0));
  const max = await tx.projectCrewListMember.aggregate({ where: { projectCrewListId: list.id }, _max: { sortOrder: true } });
  let listOrder = max._max.sortOrder ?? -1;
  for (const row of rows) {
    if (!row.isActive || ids.includes(row.personId)) continue;
    const roles = crewRoles(row);
    const remaining = roles.filter((role) => !isLeadRole(role, "producer") && !isLeadRole(role, "director"));
    if (remaining.length !== roles.length) {
      await tx.projectCrew.update({ where: { id: row.id }, data: { roleOverride: remaining.join(", ") || "Crew" } });
    }
  }
  for (const personId of ids) {
    const existing = rows.find((row) => row.personId === personId);
    const roles = existing ? crewRoles(existing).filter((role) => !isLeadRole(role, "producer") && !isLeadRole(role, "director") && role !== "Crew") : [];
    if (personId === producerId) roles.push("Produsent");
    if (personId === directorId) roles.push("Regissør");
    const crew = await tx.projectCrew.upsert({
      where: { projectId_personId: { projectId, personId } },
      create: { projectId, personId, roleOverride: roles.join(", "), sortOrder: ++sortOrder },
      update: { isActive: true, excludedFromDefaultCrewList: false, roleOverride: roles.join(", ") },
    });
    await tx.projectCrewListMember.upsert({ where: { projectCrewListId_projectCrewId: { projectCrewListId: list.id, projectCrewId: crew.id } }, create: { projectCrewListId: list.id, projectCrewId: crew.id, sortOrder: ++listOrder }, update: {} });
    await tx.person.update({ where: { id: personId }, data: { lastUsedAt: new Date() } });
  }
}
