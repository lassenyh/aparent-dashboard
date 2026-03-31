"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { safeLoginRedirect } from "@/lib/login-redirect";
import { LoginForm } from "./login-form";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSuccess() {
    router.push(safeLoginRedirect(searchParams.get("next")));
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Aparent Crew
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Logg inn for å fortsette
          </p>
        </header>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
