"use client";

import { useState } from "react";
import Link from "next/link";

export function SignupForm() {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const data = new FormData(e.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "").trim();
    const fullName = String(data.get("fullName") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fullName, company }),
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Noe gikk galt.");
        return;
      }
      setDone(true);
    } catch {
      setError("Kunne ikke nå serveren. Sjekk nettverk eller prøv igjen.");
    } finally {
      setPending(false);
    }
  }

  const labelClass = "mb-1.5 block text-xs font-medium text-zinc-500";
  const inputClass =
    "w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50";

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-200">Konto opprettet!</p>
        <p className="text-xs text-zinc-500">
          Du kan nå logge inn med brukernavnet og passordet ditt.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-block w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
        >
          Gå til innlogging
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Fullt navn <span className="text-zinc-700">(valgfritt)</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className={inputClass}
          placeholder="Ola Nordmann"
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="company" className={labelClass}>
          Selskap <span className="text-zinc-700">(valgfritt)</span>
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          className={inputClass}
          placeholder="Produksjonsselskap AS"
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="username" className={labelClass}>
          Brukernavn
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          className={inputClass}
          placeholder="brukernavn"
          required
          disabled={pending}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Passord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          placeholder="Minst 8 tegn"
          required
          disabled={pending}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50"
      >
        {pending ? "…" : "Opprett konto"}
      </button>

      {error && (
        <p className="pt-1 text-center text-xs text-red-400">{error}</p>
      )}
    </form>
  );
}
