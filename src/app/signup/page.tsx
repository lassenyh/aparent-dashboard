import type { Metadata } from "next";
import Link from "next/link";
import { AparentLogo } from "@/components/aparent-logo";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Opprett konto" };

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0c0c0e] px-4 py-8">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <header className="mb-10 flex flex-col items-center gap-4 text-center">
          <div className="[&_img]:brightness-0 [&_img]:invert [&_img]:opacity-90">
            <AparentLogo alt="Aparent" className="h-10 w-auto object-contain" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
            Production Dashboard
          </p>
        </header>

        {/* Card */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm">
          <h1 className="mb-6 text-sm font-semibold text-zinc-200">Opprett konto</h1>
          <SignupForm />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Har du allerede en konto?{" "}
          <Link href="/login" className="text-amber-500 transition hover:text-amber-400">
            Logg inn
          </Link>
        </p>
      </div>
    </div>
  );
}
