import type { Person } from "@prisma/client";

export function computeFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

export function primaryRole(person: Pick<Person, "roles">): string {
  return person.roles[0] ?? "—";
}

export function rolesLabel(person: Pick<Person, "roles">): string {
  return person.roles.length ? person.roles.join(", ") : "—";
}
