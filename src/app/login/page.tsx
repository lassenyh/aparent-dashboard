import { Suspense } from "react";
import { LoginPageClient } from "./login-page-client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
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
