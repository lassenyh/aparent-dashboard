import { AppShell } from "@/components/app-shell";
import { requireSessionDashboardUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionDashboardUser();
  return <AppShell isInternal={user.isInternal}>{children}</AppShell>;
}
