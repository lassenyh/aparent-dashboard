import type {
  DietaryPreference,
  Person,
  ProjectCrew,
  RateType,
} from "@prisma/client";
import { primaryRole } from "@/lib/person";

type ProjectCrewWithPerson = ProjectCrew & { person: Person };

/** Resolve effective role: project override, else first global role. */
export function resolveRoleForProject(pc: ProjectCrewWithPerson): string {
  return pc.roleOverride ?? primaryRole(pc.person);
}

export function resolveRateForProject(
  pc: ProjectCrewWithPerson,
): Person["defaultRate"] {
  if (pc.rateOverride != null) return pc.rateOverride;
  return pc.person.defaultRate;
}

export function resolveRateTypeForProject(
  pc: ProjectCrewWithPerson,
): RateType {
  return pc.rateTypeOverride ?? pc.person.rateType;
}

/** Snapshot source: project overrides first, then person defaults. */
export function buildCallSheetSnapshotData(pc: ProjectCrewWithPerson): {
  fullNameSnapshot: string;
  roleSnapshot: string;
  phoneSnapshot: string | null;
  emailSnapshot: string | null;
  dietaryPreferenceSnapshot: DietaryPreference;
  allergiesSnapshot: string | null;
  rateSnapshot: Person["defaultRate"];
  rateTypeSnapshot: RateType | null;
} {
  const p = pc.person;
  return {
    fullNameSnapshot: p.fullName,
    roleSnapshot: resolveRoleForProject(pc),
    phoneSnapshot: p.phone,
    emailSnapshot: p.email,
    dietaryPreferenceSnapshot: p.dietaryPreference,
    allergiesSnapshot: p.allergies,
    rateSnapshot: resolveRateForProject(pc),
    rateTypeSnapshot: resolveRateTypeForProject(pc),
  };
}
