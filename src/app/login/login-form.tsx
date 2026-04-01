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

  const inputClass =
    "w-full rounded-2xl border border-neutral-200 bg-neutral-50/80 px-3.5 py-2.5 text-sm text-neutral-900 outline-none ring-0 transition placeholder:text-neutral-400 focus:border-[#eaa631] focus:bg-white focus:ring-2 focus:ring-[#eaa631]/35 disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-xs font-medium text-neutral-600"
        >
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
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-medium text-neutral-600"
        >
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
        className="mt-4 w-full rounded-full bg-[#eaa631] px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-[#f1b64f] active:bg-[#dda124] disabled:opacity-60"
      >
        {pending ? "…" : "Logg inn"}
      </button>
      {error && (
        <p className="pt-2 text-center text-xs text-red-600">{error}</p>
      )}
    </form>
  );
}
