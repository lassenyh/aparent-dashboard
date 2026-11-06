"use client";

import { useSearchParams } from "next/navigation";
import { ProductLockup, ProductWordmark } from "@/components/product-mark";
import { PRODUCT_SERVICE, WRAPUP_THEME_ACTIVE } from "@/lib/product";
import { safeLoginRedirect } from "@/lib/login-redirect";
import { LoginForm } from "./login-form";

export function LoginPageClient() {
  const searchParams = useSearchParams();

  function handleSuccess() {
    const target = safeLoginRedirect(searchParams.get("next"));
    window.location.assign(target);
  }

  return (
    <div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="flex w-full flex-col items-center gap-6">
          {WRAPUP_THEME_ACTIVE ? (
            <ProductLockup service={PRODUCT_SERVICE} size="lg" />
          ) : (
            <ProductWordmark size="lg" />
          )}
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
