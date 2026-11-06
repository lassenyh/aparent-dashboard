"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductLockup } from "@/components/product-mark";

type Tokens = { access_token: string; refresh_token: string };
export function CompleteAuthForm() {
  const initialized = useRef(false);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (access_token && refresh_token && ["invite", "recovery"].includes(hash.get("type") ?? "")) {
      setTokens({ access_token, refresh_token });
    } else {
      setError("Lenken mangler, er utløpt eller er allerede brukt. Be administrator sende en ny invitasjon eller en lenke for å tilbakestille passordet.");
    }
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tokens || pending) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) { setError("Passordene må være like."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tokens, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Kunne ikke lagre passordet."); return; }
      setTokens(null);
      window.location.replace("/");
    } catch { setError("Kunne ikke koble til. Prøv igjen."); }
    finally { setPending(false); }
  }
  return <div className="w-full max-w-md space-y-6">
    <ProductLockup service="desk" size="lg" />
    <div><h1 className="text-2xl font-semibold">Velg passord</h1>
      <p className="mt-2 text-sm text-muted-foreground">Fullfør tilgangen din til WrapUp Desk. Velg et eget passord for denne tjenesten.</p></div>
    {tokens && <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2"><span>Nytt passord</span><Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      <label className="block space-y-2"><span>Gjenta passord</span><Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      <p className="text-xs text-muted-foreground">Minst 8 tegn.</p>
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Lagrer …" : "Lagre passord og logg inn"}</Button>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Link href="/login" className="block text-sm underline">Til innlogging</Link>
  </div>;
}
