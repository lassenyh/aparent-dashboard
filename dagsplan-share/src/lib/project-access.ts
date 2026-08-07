/**
 * Adapted from dashboard `src/lib/project-access.ts` for Dagsplan sharing.
 *
 * The full dashboard file also defines payroll / call-sheet / sensitive-data
 * helpers and flags. Those were removed here so this package does not expose
 * unrelated access surfaces. Types keep a smaller flag set; host apps should
 * align with their own auth model.
 */
import { notFound } from "next/navigation";
import type { DashboardUser, ProjectMembership } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSessionDashboardUser } from "@/lib/auth-session";

export type ProjectAccessFlags = {
  role: ProjectMembership["role"];
  canViewProjectInfo: boolean;
  canViewCrew: boolean;
  canEditCrew: boolean;
  canViewDagsplan: boolean;
  canEditDagsplan: boolean;
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
  | "canManageMemberships";

function hasKey(flags: ProjectAccessFlags, key: PermissionKey): boolean {
  return Boolean(flags[key as keyof ProjectAccessFlags]);
}

function membershipToFlags(m: ProjectMembership): ProjectAccessFlags {
  const canEditProjectInfo = false;
  const canManageMemberships = m.role === "owner" || m.role === "admin";
  return {
    role: m.role,
    canViewProjectInfo: m.canViewProjectInfo,
    canViewCrew: m.canViewCrew,
    canEditCrew: m.canEditCrew,
    canViewDagsplan: m.canViewDagsplan,
    canEditDagsplan: m.canEditDagsplan,
    canEditProjectInfo,
    canManageMemberships,
  };
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

export async function requireProjectAccess(projectId: string): Promise<{
  user: DashboardUser;
  flags: ProjectAccessFlags;
}> {
  const user = await requireSessionDashboardUser();
  const flags = await getProjectAccessForUser(user, projectId);
  if (!flags) notFound();
  return { user, flags };
}

export function assertPermission(
  flags: ProjectAccessFlags,
  key: PermissionKey,
): void {
  if (!hasKey(flags, key)) notFound();
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
