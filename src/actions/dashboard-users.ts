"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/auth-password";
import { prisma } from "@/lib/db";
import { requireSessionDashboardUser } from "@/lib/auth-session";
import { requireInternalUser } from "@/lib/project-access";

const USER_ACCESS_PATH = "/brukertilgang";

export async function listDashboardUsers() {
  await requireInternalUser();
  return prisma.dashboardUser.findMany({
    orderBy: [{ isInternal: "desc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      company: true,
      isInternal: true,
      isActive: true,
      createdAt: true,
      memberships: {
        orderBy: [{ project: { name: "asc" } }],
        select: {
          role: true,
          project: {
            select: {
              id: true,
              name: true,
              internalTitle: true,
            },
          },
        },
      },
    },
  });
}

export async function createDashboardUser(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  void _prev;
  await requireInternalUser();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const isInternal =
    formData.get("isInternal") === "on" || formData.get("isInternal") === "true";
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!username) return { error: "Brukernavn mangler." };
  if (password.length < 8) {
    return { error: "Passord må være minst 8 tegn." };
  }

  const exists = await prisma.dashboardUser.findUnique({ where: { username } });
  if (exists) return { error: "Brukernavn finnes allerede." };

  const passwordHash = await hashPassword(password);
  await prisma.dashboardUser.create({
    data: {
      username,
      passwordHash,
      fullName,
      email,
      isInternal,
      isActive,
    },
  });

  revalidatePath(USER_ACCESS_PATH);
  return null;
}

export async function updateDashboardUserAccess(
  userId: string,
  formData: FormData,
): Promise<void> {
  const actor = await requireInternalUser();
  const row = await prisma.dashboardUser.findUnique({
    where: { id: userId },
    select: { id: true, isInternal: true, isActive: true },
  });
  if (!row) return;

  const isInternal =
    formData.get("isInternal") === "on" || formData.get("isInternal") === "true";
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  const isSelf = actor.id === row.id;
  if (isSelf && !isInternal) return;
  if (isSelf && !isActive) return;

  await prisma.dashboardUser.update({
    where: { id: row.id },
    data: { isInternal, isActive },
  });

  revalidatePath(USER_ACCESS_PATH);
}

export async function removeDashboardUser(userId: string): Promise<void> {
  const actor = await requireSessionDashboardUser();
  if (!actor.isInternal) return;
  if (actor.id === userId) return;

  await prisma.dashboardUser.delete({ where: { id: userId } });
  revalidatePath(USER_ACCESS_PATH);
}
