import { redirect } from "next/navigation";
import { AppLauncher } from "@/components/wrapup/app-launcher";
import { getSessionDashboardUser } from "@/lib/auth-session";

/** Startsiden: velg app. Desk ligger på /desk. */
export default async function StartPage() {
  const user = await getSessionDashboardUser();
  if (!user) redirect("/login");
  return <AppLauncher userName={user.fullName?.trim() || user.username} />;
}
