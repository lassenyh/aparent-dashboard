import type { Person } from "@prisma/client";

export function computeFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

export function primaryRole(person: Pick<Person, "roles">): string {
  const roles = person.roles;
  if (!roles?.length) return "—";
  return roles[0] ?? "—";
}

export function rolesLabel(person: Pick<Person, "roles">): string {
  const roles = person.roles;
  return roles?.length ? roles.join(", ") : "—";
}
