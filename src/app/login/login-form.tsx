"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: Props) {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"login" | "recover">("login");
  const [recoverSent, setRecoverSent] = useState(false);

  async function handleRecover(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    setPending(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kunne ikke sende lenken. Prøv igjen.");
        return;
      }
      setRecoverSent(true);
    } catch {
      setError("Kunne ikke nå serveren. Sjekk nettverk eller prøv igjen.");
    } finally {
      setPending(false);
    }
  }

  if (mode === "recover") {
    return (
      <div className="w-full space-y-4">
        {recoverSent ? (
          <p role="status" className="text-sm text-muted-foreground">
            Hvis e-posten hører til en WrapUp-bruker, får du snart en lenke for å velge nytt passord.
          </p>
        ) : (
          <form onSubmit={handleRecover} className="w-full space-y-4">
            <div className="ap-field">
              <Label htmlFor="recover-email">E-post</Label>
              <Input id="recover-email" name="email" type="email" autoComplete="email" required disabled={pending} />
            </div>
            <p className="text-xs text-muted-foreground">
              Samme konto og passord gjelder for Desk, Sign og Planner.
            </p>
            {error ? <p className="ap-error text-center" role="alert">{error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Sender…" : "Send lenke for nytt passord"}
            </Button>
          </form>
        )}
        <button
          type="button"
          onClick={() => { setMode("login"); setRecoverSent(false); setError(undefined); }}
          className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Tilbake til innlogging
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const form = e.currentTarget;
    const username = String(new FormData(form).get("username") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");

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

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="ap-field">
        <Label htmlFor="username">Brukernavn eller e-post</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="brukernavn eller e-post"
          required
          disabled={pending}
        />
      </div>
      <div className="ap-field">
        <Label htmlFor="password">Passord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={pending}
        />
      </div>
      {error ? (
        <p className="ap-error text-center" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Logger inn…" : "Logg inn"}
      </Button>
      <button
        type="button"
        onClick={() => { setMode("recover"); setError(undefined); }}
        className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Glemt passord?
      </button>
    </form>
  );
}
