"use client";

import { useState } from "react";

type Props = {
  onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: Props) {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = e.currentTarget;
    const username = String(new FormData(form).get("username") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "").trim();

    if (!username || !password) {
      setError("Feil brukernavn eller passord.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Feil brukernavn eller passord.",
        );
        return;
      }
      onSuccess?.();
    } catch {
      setError("Kunne ikke nå serveren. Sjekk nettverk eller prøv igjen.");
    } finally {
      setPending(false);
    }
  }

  const labelClass = "mb-1.5 block text-xs font-medium text-zinc-500";
  const inputClass =
    "w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
          className={inputClass}
          placeholder="••••••••"
          required
          disabled={pending}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50"
      >
        {pending ? "…" : "Logg inn"}
      </button>
      {error && (
        <p className="pt-1 text-center text-xs text-red-400">{error}</p>
      )}
    </form>
  );
}
