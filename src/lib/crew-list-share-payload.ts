import type { Person, ProjectCrew } from "@prisma/client";
import { formatCrewListDietaryAllergies } from "@/lib/dietary";
import { resolveRoleForProject } from "@/lib/snapshot";

export type CrewListSharePayload = {
  project: { name: string; internalTitle: string | null };
  rows: Array<{
    id: string;
    role: string;
    fullName: string;
    phone: string;
    email: string;
    /** Sammensatt kost/allergier — `null` når tomt (kolonne skjules da for hele tabellen). */
    dietaryAllergiesLine: string | null;
  }>;
  crewListUpdatedAt: string;
};

type MemberWithCrew = {
  id: string;
  projectCrew: ProjectCrew & { person: Person };
};

export function toCrewListSharePayload(data: {
  project: { name: string; internalTitle: string | null };
  crewListUpdatedAt: Date;
  members: MemberWithCrew[];
}): CrewListSharePayload {
  const rows = data.members.map((m) => {
    const pc = m.projectCrew;
    const p = pc.person;
    return {
      id: m.id,
      role: resolveRoleForProject(pc),
      fullName: p.fullName,
      phone: p.phone?.trim() || "—",
      email: p.email?.trim() || "—",
      dietaryAllergiesLine: formatCrewListDietaryAllergies(
        p.dietaryPreference,
        p.allergies,
      ),
    };
  });
  return {
    project: {
      name: data.project.name,
      internalTitle: data.project.internalTitle,
    },
    rows,
    crewListUpdatedAt: data.crewListUpdatedAt.toISOString(),
  };
}
