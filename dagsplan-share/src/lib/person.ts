/**
 * Subset of dashboard `src/lib/person.ts` used by Dagsplan.
 * Other person helpers used by crew/payroll were omitted.
 */
import type { Person } from "@prisma/client";

export function primaryRole(person: Pick<Person, "roles">): string {
  const roles = person.roles;
  if (!roles?.length) return "—";
  return roles[0] ?? "—";
}
