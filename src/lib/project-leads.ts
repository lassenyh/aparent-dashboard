export type LeadPerson = { id: string; fullName: string; roles: string[] };
export type ProjectLeads = { producerId: string; directorId: string; producerName: string; directorName: string };
type Crew = { personId: string; roleOverride: string | null; person: { fullName: string; roles: string[] } };
export function crewRoles(row: { roleOverride: string | null; person: { roles: string[] } }) {
  return (row.roleOverride ?? row.person.roles[0] ?? "").split(/[,/]/).map((role) => role.trim()).filter(Boolean);
}
export function isLeadRole(role: string, kind: "producer" | "director") {
  return (kind === "producer" ? ["produsent", "producer"] : ["regissør", "director"]).includes(role.toLowerCase());
}
export function projectLeads(crew: Crew[]): ProjectLeads {
  const producer = crew.find((row) => crewRoles(row).some((role) => isLeadRole(role, "producer")));
  const director = crew.find((row) => crewRoles(row).some((role) => isLeadRole(role, "director")));
  return { producerId: producer?.personId ?? "", directorId: director?.personId ?? "", producerName: producer?.person.fullName ?? "—", directorName: director?.person.fullName ?? "—" };
}

/** Crew categories eligible for the project's producer selection. */
export function isProducerRole(role: string): boolean {
  return ["produsent", "producer", "linjeprodusent", "linje produsent", "linje-produsent", "line producer", "line-producer"].includes(role.trim().toLowerCase());
}
