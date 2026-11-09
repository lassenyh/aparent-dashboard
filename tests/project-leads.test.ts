import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
import { projectLeads, isProducerRole } from "../src/lib/project-leads";
import { syncProjectLeads } from "../src/lib/sync-project-leads";

test("project info resolves combined and English crew roles", () => {
  assert.deepEqual(projectLeads([{ personId: "a", roleOverride: "Producer / Director", person: { fullName: "A", roles: [] } }]), {
    producerId: "a", directorId: "a", producerName: "A", directorName: "A",
  });
});

test("reassigning leads preserves other roles and crew history, reuses rows and list entries", async () => {
  const rows = [
    { id: "old", personId: "old", isActive: true, roleOverride: "Produsent, Fotograf", sortOrder: 1, person: { roles: [] } },
    { id: "new", personId: "new", isActive: false, roleOverride: "DOP", sortOrder: 2, person: { roles: [] } },
  ];
  const members = new Set<string>();
  const tx = {
    projectCrew: {
      findMany: async () => rows,
      update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(rows.find((row) => row.id === where.id)!, data),
      upsert: async ({ where, update }: { where: { projectId_personId: { personId: string } }; update: object }) => Object.assign(rows.find((row) => row.personId === where.projectId_personId.personId)!, update),
    },
    projectCrewList: { upsert: async () => ({ id: "list" }) },
    projectCrewListMember: {
      aggregate: async () => ({ _max: { sortOrder: 0 } }),
      upsert: async ({ create }: { create: { projectCrewId: string } }) => { members.add(create.projectCrewId); },
    },
    person: { update: async () => ({}) },
  } as unknown as Prisma.TransactionClient;
  await syncProjectLeads(tx, "project", "new", "new");
  await syncProjectLeads(tx, "project", "new", "new");
  assert.equal(rows[0].roleOverride, "Fotograf");
  assert.equal(rows[0].isActive, true);
  assert.equal(rows[1].roleOverride, "DOP, Produsent, Regissør");
  assert.equal(rows[1].isActive, true);
  assert.equal(rows.length, 2);
  assert.deepEqual([...members], ["new"]);
  await syncProjectLeads(tx, "project", "", "");
  assert.equal(rows[1].roleOverride, "DOP");
});

test("producer selection only accepts producer and line producer categories", () => {
  for (const role of ["Produsent", "Producer", "Linjeprodusent", "Linje-produsent", "Line producer"]) assert.equal(isProducerRole(role), true);
  for (const role of ["Regissør", "DOP", "Produksjonsleder", "Executive producer", "Producer assistant"]) assert.equal(isProducerRole(role), false);
});
