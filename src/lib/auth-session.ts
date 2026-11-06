import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { prisma } from "@/lib/db";
import { hashAuthToken, newAuthToken, validAuthToken } from "@/lib/auth-token";

export const sessionCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, path: "/",
  secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
  maxAge: 60 * 60 * 24 * 7,
};
export async function createDashboardSession(userId: string) {
  const token = newAuthToken();
  await prisma.dashboardSession.create({ data: {
    tokenHash: hashAuthToken(token), userId,
    expiresAt: new Date(Date.now() + sessionCookieOptions.maxAge * 1000),
  } });
  return token;
}
/**
 * Én DB-spørring per request: layout, side og alle hjelpere deler resultatet via React `cache()`.
 * (Utenfor React-render, f.eks. i route handlers, kjøres den bare som vanlig.)
 */
const loadSessionUser = cache(async (token: string) => {
  const session = await prisma.dashboardSession.findUnique({
    where: { tokenHash: hashAuthToken(token) }, include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;
  return session.user;
});
export async function getSessionDashboardUser() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? "";
  // Old user-ID cookies are intentionally invalidated; users must log in again.
  if (!validAuthToken(token)) return null;
  return loadSessionUser(token);
}
export async function requireSessionDashboardUser() {
  const user = await getSessionDashboardUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
export async function deleteDashboardSession() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? "";
  if (validAuthToken(token)) await prisma.dashboardSession.deleteMany({ where: { tokenHash: hashAuthToken(token) } });
}
