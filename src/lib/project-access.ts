import { notFound } from "next/navigation";
import type { DashboardUser, ProjectMembership } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSessionDashboardUser } from "@/lib/auth-session";

/** Effektive flagg for én bruker på ett prosjekt (intern = alt). */
export type ProjectAccessFlags = {
  role: ProjectMembership["role"];
  canViewProjectInfo: boolean;
  canViewCrew: boolean;
  canEditCrew: boolean;
  canViewDagsplan: boolean;
  canEditDagsplan: boolean;
  canViewCallSheets: boolean;
  canEditCallSheets: boolean;
  canViewSensitiveData: boolean;
  canViewPayroll: boolean;
  canEditPayroll: boolean;
  canImportCrewDatabase: boolean;
  canEditProjectInfo: boolean;
  canManageMemberships: boolean;
};

const FULL_ACCESS: ProjectAccessFlags = {
  role: "owner",
  canViewProjectInfo: true,
  canViewCrew: true,
  canEditCrew: true,
  canViewDagsplan: true,
  canEditDagsplan: true,
  canViewCallSheets: true,
  canEditCallSheets: true,
  canViewSensitiveData: true,
  canViewPayroll: true,
  canEditPayroll: true,
  canImportCrewDatabase: true,
  canEditProjectInfo: true,
  canManageMemberships: true,
};

export type PermissionKey =
  | "canViewProjectInfo"
  | "canEditProjectInfo"
  | "canViewCrew"
  | "canEditCrew"
  | "canViewDagsplan"
  | "canEditDagsplan"
  | "canViewCallSheets"
  | "canEditCallSheets"
  | "canViewSensitiveData"
  | "canViewPayroll"
  | "canEditPayroll"
  | "canImportCrewDatabase"
  | "canManageMemberships";

function hasKey(flags: ProjectAccessFlags, key: PermissionKey): boolean {
  return Boolean(flags[key as keyof ProjectAccessFlags]);
}

function membershipToFlags(m: ProjectMembership): ProjectAccessFlags {
  /** Eksterne brukere skal kun kunne lese prosjektinfo; redigering er kun for interne (FULL_ACCESS). */
  const canEditProjectInfo = false;
  const canManageMemberships = m.role === "owner" || m.role === "admin";
  return {
    role: m.role,
    canViewProjectInfo: m.canViewProjectInfo,
    canViewCrew: m.canViewCrew,
    canEditCrew: m.canEditCrew,
    canViewDagsplan: m.canViewDagsplan,
    canEditDagsplan: m.canEditDagsplan,
    canViewCallSheets: m.canViewCallSheets,
    canEditCallSheets: m.canEditCallSheets,
    canViewSensitiveData: m.canViewSensitiveData,
    canViewPayroll: m.canViewPayroll,
    canEditPayroll: m.canEditPayroll,
    canImportCrewDatabase: m.canImportCrewDatabase,
    canEditProjectInfo,
    canManageMemberships,
  };
}

export async function getAccessibleProjectIds(
  user: DashboardUser,
): Promise<string[] | null> {
  if (user.isInternal) return null;
  const rows = await prisma.projectMembership.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

export async function getProjectMembership(
  userId: string,
  projectId: string,
): Promise<ProjectMembership | null> {
  return prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

export async function getProjectAccessForUser(
  user: DashboardUser,
  projectId: string,
): Promise<ProjectAccessFlags | null> {
  if (user.isInternal) return FULL_ACCESS;
  const m = await getProjectMembership(user.id, projectId);
  if (!m) return null;
  return membershipToFlags(m);
}

/** Krev innlogget bruker og medlemskap (eller intern). */
export async function requireProjectAccess(projectId: string): Promise<{
  user: DashboardUser;
  flags: ProjectAccessFlags;
}> {
  const user = await requireSessionDashboardUser();
  const flags = await getProjectAccessForUser(user, projectId);
  if (!flags) notFound();
  return { user, flags };
}

export async function requireInternalUser(): Promise<DashboardUser> {
  const user = await requireSessionDashboardUser();
  if (!user.isInternal) notFound();
  return user;
}

export function assertPermission(
  flags: ProjectAccessFlags,
  key: PermissionKey,
): void {
  if (!hasKey(flags, key)) notFound();
}

export async function requireProjectAccessByProjectCrewId(
  projectCrewId: string,
): Promise<{ user: DashboardUser; flags: ProjectAccessFlags; projectId: string }> {
  const row = await prisma.projectCrew.findUnique({
    where: { id: projectCrewId },
    select: { projectId: true },
  });
  if (!row) notFound();
  const { user, flags } = await requireProjectAccess(row.projectId);
  return { user, flags, projectId: row.projectId };
}

export async function requireProjectAccessByDagsplanId(
  dagsplanId: string,
): Promise<{ user: DashboardUser; flags: ProjectAccessFlags; projectId: string }> {
  const row = await prisma.dagsplan.findUnique({
    where: { id: dagsplanId },
    select: { projectId: true },
  });
  if (!row) notFound();
  const { user, flags } = await requireProjectAccess(row.projectId);
  return { user, flags, projectId: row.projectId };
}

export async function requireProjectAccessByCallSheetId(
  callSheetId: string,
): Promise<{ user: DashboardUser; flags: ProjectAccessFlags; projectId: string }> {
  const row = await prisma.callSheet.findUnique({
    where: { id: callSheetId },
    select: { projectId: true },
  });
  if (!row) notFound();
  const { user, flags } = await requireProjectAccess(row.projectId);
  return { user, flags, projectId: row.projectId };
}

export async function requireProjectAccessByPayrollListId(
  listId: string,
): Promise<{ user: DashboardUser; flags: ProjectAccessFlags; projectId: string }> {
  const row = await prisma.payrollList.findUnique({
    where: { id: listId },
    select: { projectId: true },
  });
  if (!row) notFound();
  const { user, flags } = await requireProjectAccess(row.projectId);
  return { user, flags, projectId: row.projectId };
}
