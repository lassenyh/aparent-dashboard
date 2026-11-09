import assert from "node:assert/strict";
import test from "node:test";
import type { Person, ProjectCrew } from "../src/generated/prisma/client";
import { sortCrewListMembersByDepartmentOrder, sortDagsplanCrewRowsByDepartmentOrder } from "../src/lib/crew-department-order";

test("crew list matches dagsplan hierarchy, preserves manual order within roles and uses overrides", () => {
  const members = [
    { id: "sound", role: "Lyd", sortOrder: 0 },
    { id: "director2", role: "Regissør", sortOrder: 4 },
    { id: "producer", role: "Produsent", sortOrder: 3 },
    { id: "director1", role: "Regissør", sortOrder: 2 },
    { id: "camera", role: "B-foto", sortOrder: 1 },
  ].map(({ role, ...row }) => ({ ...row, projectCrew: {
    roleOverride: role, person: { roles: ["Lyd"] },
  } as ProjectCrew & { person: Person } }));
  const sorted = sortCrewListMembersByDepartmentOrder(members);
  assert.deepEqual(sorted.map(row => row.id), ["producer", "director1", "director2", "camera", "sound"]);
  const dagsplan = sortDagsplanCrewRowsByDepartmentOrder([...members].sort((a,b) => a.sortOrder-b.sortOrder).map(row => ({ id: row.id, departmentTitle: row.projectCrew.roleOverride! })));
  assert.deepEqual(sorted.map(row => row.id), dagsplan.map(row => row.id));
  assert.equal(members[0].id, "sound");
});
