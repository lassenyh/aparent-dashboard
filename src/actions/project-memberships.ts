"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "@/lib/auth-password";
import { prisma } from "@/lib/db";
import {
  assertPermission,
  requireProjectAccess,
} from "@/lib/project-access";

const roleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

const membershipUpdateSchema = z.object({
  role: roleSchema,
  canViewProjectInfo: z.boolean(),
  canEditProjectInfo: z.boolean(),
  canViewCrew: z.boolean(),
  canEditCrew: z.boolean(),
  canViewDagsplan: z.boolean(),
  canEditDagsplan: z.boolean(),
  canViewCallSheets: z.boolean(),
  canEditCallSheets: z.boolean(),
  canViewSensitiveData: z.boolean(),
  canViewPayroll: z.boolean(),
  canEditPayroll: z.boolean(),
  canImportCrewDatabase: z.boolean(),
});

export async function listProjectMemberships(projectId: string) {
  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canManageMemberships");

  const rows = await prisma.projectMembership.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          isInternal: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows;
}

export async function addUserToProject(
  projectId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  void _prev;
  const { flags } = await requireProjectAccess(projectId);
  assertPermission(flags, "canManageMemberships");

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  const parsedRole = roleSchema.safeParse(String(formData.get("role") ?? ""));
  if (!username) {
    return { error: "Brukernavn mangler." };
  }
  if (!parsedRole.success) {
    return { error: "Ugyldig rolle." };
  }

  const bool = (k: string) =>
    formData.get(k) === "on" || formData.get(k) === "true";

  const perm = {
    canViewProjectInfo: bool("canViewProjectInfo") || bool("canEditProjectInfo"),
    canEditProjectInfo: bool("canEditProjectInfo"),
    canViewCrew: bool("canViewCrew"),
    canEditCrew: bool("canEditCrew"),
    canViewDagsplan: bool("canViewDagsplan"),
    canEditDagsplan: bool("canEditDagsplan"),
    /** Ikke eksponert i Prosjekttilgang-UI — nye medlemmer får ikke call sheet-tilgang her. */
    canViewCallSheets: false,
    canEditCallSheets: false,
    canViewSensitiveData: bool("canViewSensitiveData"),
    canViewPayroll: bool("canViewPayroll"),
    canEditPayroll: bool("canEditPayroll"),
    canImportCrewDatabase: bool("canImportCrewDatabase"),
  };

  const existingUser = await prisma.dashboardUser.findUnique({
    where: { username },
  });

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    if (password.trim().length < 8) {
      return {
        error: "Passord må være minst 8 tegn når du oppretter en ny bruker.",
      };
    }
    const passwordHash = await hashPassword(password.trim());
    const created = await prisma.dashboardUser.create({
      data: {
        username,
        passwordHash,
        fullName,
        email,
        isInternal: false,
      },
    });
    userId = created.id;
  }

  const dup = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (dup) {
    return {
      error: "Denne brukeren er allerede lagt til i prosjektet.",
    };
  }

  await prisma.projectMembership.create({
    data: {
      userId,
      projectId,
      role: parsedRole.data,
      ...perm,
    },
  });

  revalidatePath(`/desk/projects/${projectId}`);
  return null;
}

export async function updateProjectMembership(
  membershipId: string,
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const row = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      projectId: true,
      canViewCallSheets: true,
      canEditCallSheets: true,
    },
  });
  if (!row) return { error: "Tilgangen finnes ikke lenger. Last inn siden på nytt." };

  const { flags } = await requireProjectAccess(row.projectId);
  assertPermission(flags, "canManageMemberships");

  const raw = {
    role: String(formData.get("role") ?? ""),
    canViewProjectInfo: formData.get("canViewProjectInfo") === "on",
    canEditProjectInfo: formData.get("canEditProjectInfo") === "on",
    canViewCrew: formData.get("canViewCrew") === "on",
    canEditCrew: formData.get("canEditCrew") === "on",
    canViewDagsplan: formData.get("canViewDagsplan") === "on",
    canEditDagsplan: formData.get("canEditDagsplan") === "on",
    /** Ikke i skjema — behold lagrede verdier. */
    canViewCallSheets: formData.get("canViewCallSheets") === "on",
    canEditCallSheets: formData.get("canEditCallSheets") === "on",
    canViewSensitiveData: formData.get("canViewSensitiveData") === "on",
    canViewPayroll: formData.get("canViewPayroll") === "on",
    canEditPayroll: formData.get("canEditPayroll") === "on",
    canImportCrewDatabase: formData.get("canImportCrewDatabase") === "on",
  };

  const parsed = membershipUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Rettighetene kunne ikke lagres. Kontroller valgene og prøv igjen." };
  }

  const d = parsed.data;
  await prisma.projectMembership.update({
    where: { id: membershipId },
    data: {
      role: d.role,
      canViewProjectInfo: d.canViewProjectInfo || d.canEditProjectInfo,
      canEditProjectInfo: d.canEditProjectInfo,
      canViewCrew: d.canViewCrew || d.canEditCrew,
      canEditCrew: d.canEditCrew,
      canViewDagsplan: d.canViewDagsplan || d.canEditDagsplan,
      canEditDagsplan: d.canEditDagsplan,
      canViewCallSheets: d.canViewCallSheets || d.canEditCallSheets,
      canEditCallSheets: d.canEditCallSheets,
      canViewSensitiveData: d.canViewSensitiveData,
      canViewPayroll: d.canViewPayroll || d.canEditPayroll,
      canEditPayroll: d.canEditPayroll,
      canImportCrewDatabase: d.canImportCrewDatabase,
    },
  });

  revalidatePath(`/desk/projects/${row.projectId}`);
  return { success: true };
}

export async function removeProjectMembership(
  membershipId: string,
  _formData?: FormData,
) {
  void _formData;
  const row = await prisma.projectMembership.findUnique({
    where: { id: membershipId },
    select: { projectId: true, userId: true },
  });
  if (!row) return;

  const { flags } = await requireProjectAccess(row.projectId);
  assertPermission(flags, "canManageMemberships");

  await prisma.$transaction([
    prisma.projectMembership.delete({ where: { id: membershipId } }),
    prisma.projectInvitation.updateMany({ where: { projectId: row.projectId, acceptedUserId: row.userId, status: "accepted" }, data: { status: "revoked" } }),
  ]);
  revalidatePath("/desk/brukertilgang/invitasjon");
  revalidatePath(`/desk/projects/${row.projectId}`);
}
