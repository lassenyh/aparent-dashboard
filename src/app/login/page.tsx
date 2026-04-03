import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { LoginPageClient } from "./login-page-client";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionDashboardUser();
  if (user) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background" />
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
