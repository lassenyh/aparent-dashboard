/**
 * Subset of dashboard `src/lib/snapshot.ts` used by Dagsplan.
 * Call-sheet / rate snapshot builders were omitted.
 */
import type { Person, ProjectCrew } from "@prisma/client";
import { primaryRole } from "@/lib/person";

type ProjectCrewWithPerson = ProjectCrew & { person: Person };

/** Resolve effective role: project override, else first global role. */
export function resolveRoleForProject(pc: ProjectCrewWithPerson): string {
  return pc.roleOverride ?? primaryRole(pc.person);
}
