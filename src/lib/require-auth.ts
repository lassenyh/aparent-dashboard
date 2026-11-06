import { getSessionDashboardUser, requireSessionDashboardUser } from "@/lib/auth-session";
export async function getAuthSessionId(): Promise<string | null> {
  return (await getSessionDashboardUser())?.id ?? null;
}
export async function requireAuth(): Promise<string> {
  return (await requireSessionDashboardUser()).id;
}
