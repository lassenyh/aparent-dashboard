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
    </form>
  );
}
