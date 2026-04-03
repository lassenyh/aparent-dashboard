import { cookies } from "next/headers";
import type { DashboardUser } from "@prisma/client";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { prisma } from "@/lib/db";

/** Løser bruker fra session-cookie (Prisma-id eller legacy Supabase `project_logins`-id). */
export async function getSessionDashboardUser(): Promise<DashboardUser | null> {
  const c = await cookies();
  const raw = c.get(AUTH_COOKIE_NAME)?.value?.trim();
  if (!raw) return null;

  const byId = await prisma.dashboardUser.findFirst({
    where: {
      OR: [{ id: raw }, { legacySupabaseLoginId: raw }],
      isActive: true,
    },
  });
  return byId;
}

export async function requireSessionDashboardUser(): Promise<DashboardUser> {
  const u = await getSessionDashboardUser();
  if (!u) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return u!;
}
