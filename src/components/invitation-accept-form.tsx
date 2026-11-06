"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { acceptInvitation } from "@/actions/project-invitations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InvitationAcceptForm({ token, email, matchingSession }: { token: string; email: string; matchingSession: boolean }) {
  const [mode, setMode] = useState(matchingSession ? "session" : "register");
  const [state, action, pending] = useActionState(acceptInvitation.bind(null, token), null);
  return <div className="space-y-4"><form action={action} className="space-y-4">
    <input type="hidden" name="mode" value={mode} />
    <div className="space-y-2"><Label htmlFor="accept-email">Din inviterte e-post</Label><Input id="accept-email" value={email} readOnly /></div>
    {mode === "register" && <div className="space-y-2"><Label htmlFor="accept-name">Fullt navn</Label><Input id="accept-name" name="fullName" required maxLength={120} autoComplete="name" /></div>}
    {mode !== "session" && <div className="space-y-2"><Label htmlFor="accept-password">{mode === "register" ? "Velg passord" : "Passord"}</Label><Input id="accept-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} /><p className="text-xs text-muted-foreground">Minst 8 tegn.</p></div>}
    {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Button type="submit" className="w-full" disabled={pending}>{pending ? "Fullfører …" : mode === "session" ? "Godta invitasjonen" : mode === "register" ? "Opprett konto og bli med" : "Logg inn og bli med"}</Button>
  </form>{mode !== "session" && <><Button variant="ghost" className="w-full" disabled={pending} onClick={() => setMode(mode === "register" ? "login" : "register")}>{mode === "register" ? "Har du konto? Logg inn med e-post" : "Ny i WrapUp Desk? Opprett konto"}</Button><Link href={`/login?next=${encodeURIComponent(`/invitasjon/${token}`)}`} className="block text-center text-xs text-muted-foreground underline">Logg inn med eksisterende brukernavn</Link></>}</div>;
}
