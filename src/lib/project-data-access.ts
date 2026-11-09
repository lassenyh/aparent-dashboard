import type { Person, ProjectCrew } from "@/generated/prisma/client";
import type { ProjectAccessFlags } from "./project-access";

/** Redact before returning data from callable server actions, not just in the UI. */
export function redactProjectCrew<T extends ProjectCrew & { person: Person }>(row: T, flags: Pick<ProjectAccessFlags, "canViewSensitiveData" | "canViewPayroll">): T {
  return { ...row,
    rateOverride: flags.canViewPayroll ? row.rateOverride : null,
    rateTypeOverride: flags.canViewPayroll ? row.rateTypeOverride : null,
    person: { ...row.person,
      bankAccountEncrypted: null, nationalIdEncrypted: null, internalStarRating: null,
      defaultRate: flags.canViewPayroll ? row.person.defaultRate : null,
      addressLine: flags.canViewSensitiveData ? row.person.addressLine : null,
      postalCode: flags.canViewSensitiveData ? row.person.postalCode : null,
      city: flags.canViewSensitiveData ? row.person.city : null,
      country: flags.canViewSensitiveData ? row.person.country : null,
    },
  };
}
