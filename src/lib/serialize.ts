import type {
  CallSheet,
  CallSheetCrew,
  Person,
  Project,
  ProjectCrew,
} from "@prisma/client";
import { primaryRole } from "@/lib/person";
import {
  effectiveRateSourceForProject,
  resolveRateForProject,
  resolveRateTypeForProject,
  resolveRoleForProject,
} from "@/lib/snapshot";
import { formatRate } from "@/lib/utils";

/** Prisma `Decimal` is not JSON-serializable to Client Components — use plain numbers. */

/** `internalStarRating` og krypterte felt holdes kun på server — aldri med i klientpayload. */
export type PersonClient = Omit<
  Person,
  | "defaultRate"
  | "internalStarRating"
  | "bankAccountEncrypted"
  | "nationalIdEncrypted"
> & {
  defaultRate: number | null;
};

export function serializePersonForClient(person: Person): PersonClient {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    fullName: person.fullName,
    email: person.email,
    phone: person.phone,
    addressLine: person.addressLine,
    postalCode: person.postalCode,
    city: person.city,
    country: person.country,
    roles: person.roles ?? [],
    defaultRate: person.defaultRate != null ? Number(person.defaultRate) : null,
    rateType: person.rateType,
    dietaryPreference: person.dietaryPreference,
    allergies: person.allergies,
    isActive: person.isActive,
    lastUsedAt: person.lastUsedAt,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  };
}

export type ProjectFormClient = {
  id: string;
  name: string;
  internalTitle: string | null;
  agencyId: string | null;
  customerId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: Project["status"];
  createdAt: Date;
  updatedAt: Date;
};

/** Only scalar fields — do not pass `crew` / relations into client forms. */
export function projectScalarsForClient(
  project: Project & { crew?: unknown; callSheets?: unknown },
): ProjectFormClient {
  return {
    id: project.id,
    name: project.name,
    internalTitle: project.internalTitle,
    agencyId: project.agencyId,
    customerId: project.customerId,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export type CallSheetCrewClient = Omit<CallSheetCrew, "rateSnapshot"> & {
  rateSnapshot: number | null;
};

export function serializeCallSheetCrewRow(row: CallSheetCrew): CallSheetCrewClient {
  return {
    ...row,
    rateSnapshot: row.rateSnapshot != null ? Number(row.rateSnapshot) : null,
  };
}

/** Header form only needs scalars — not `crew` / `project` (avoids Decimal in nested person). */
export type CallSheetFormClient = {
  id: string;
  projectId: string;
  name: string;
  date: Date;
  location: string | null;
  generalCallTime: string | null;
  notes: string | null;
  status: CallSheet["status"];
  createdAt: Date;
  updatedAt: Date;
};

export function callSheetScalarsForClient(
  sheet: CallSheet & { crew?: unknown; project?: unknown },
): CallSheetFormClient {
  return {
    id: sheet.id,
    projectId: sheet.projectId,
    name: sheet.name,
    date: sheet.date,
    location: sheet.location,
    generalCallTime: sheet.generalCallTime,
    notes: sheet.notes,
    status: sheet.status,
    createdAt: sheet.createdAt,
    updatedAt: sheet.updatedAt,
  };
}

/** Project crew row for client list — avoids Decimal in props. */
export type ProjectCrewRowClient = {
  id: string;
  roleOverride: string | null;
  rateOverride: number | null;
  rateTypeOverride: "day" | "hour" | null;
  notes: string | null;
  person: PersonClient;
  /** Resolved role for overview line */
  effectiveRole: string;
  /** Formatted rate for overview (right column) */
  effectiveRateLabel: string;
  /** Hvor satsen i listen kommer fra (navn ≠ sats — se crew-profil) */
  effectiveRateSource: "project" | "person" | "none";
  /** Default role placeholder from person */
  suggestedRolePrimary: string;
};

export function serializeProjectCrewRowForClient(
  pc: ProjectCrew & { person: Person },
): ProjectCrewRowClient {
  const person = serializePersonForClient(pc.person);
  const effectiveRate = resolveRateForProject(pc);
  const effectiveType = resolveRateTypeForProject(pc);
  return {
    id: pc.id,
    roleOverride: pc.roleOverride,
    rateOverride: pc.rateOverride != null ? Number(pc.rateOverride) : null,
    rateTypeOverride: pc.rateTypeOverride ?? null,
    notes: pc.notes,
    person,
    effectiveRole: resolveRoleForProject(pc),
    effectiveRateLabel: formatRate(effectiveRate, effectiveType),
    effectiveRateSource: effectiveRateSourceForProject(pc),
    suggestedRolePrimary: primaryRole(pc.person),
  };
}
