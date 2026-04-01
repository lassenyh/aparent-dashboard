"use client";

import { useSearchParams } from "next/navigation";
import { AparentLogo } from "@/components/aparent-logo";
import { safeLoginRedirect } from "@/lib/login-redirect";
import { LoginForm } from "./login-form";

export function LoginPageClient() {
  const searchParams = useSearchParams();

  function handleSuccess() {
    const target = safeLoginRedirect(searchParams.get("next"));
    window.location.assign(target);
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-neutral-100 px-4 py-8 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-neutral-200/90 bg-white px-8 py-10 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:px-10">
        <header className="flex flex-col items-center text-center">
          <div className="flex w-full flex-col items-center gap-[50px]">
            <div className="flex w-full justify-center">
              <AparentLogo
                alt=""
                className="h-[50.4px] max-h-[60.5px] w-auto max-w-full object-contain object-center"
              />
            </div>
            <p className="text-center text-[14px] font-medium leading-tight tracking-[0.2em] text-muted-foreground [font-family:var(--font-production-dashboard)]">
              <span className="block">PRODUCTION</span>
              <span className="block">DASHBOARD</span>
            </p>
          </div>
        </header>
        <div className="mt-10">
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
