"use client";

import { useState } from "react";
import { ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
import { ProductLockup } from "@/components/wrapup/product-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectClassName } from "@/lib/form-classes";

type Access = "none" | "read" | "write";
const modules = ["Prosjektinfo", "Crew", "Dagsplaner", "Call sheets", "Lønningslister"];
const accessLabels = { none: "Ingen tilgang", read: "Kan lese", write: "Kan lese og redigere" };
type Invitation = { email: string; project: string; access: Access[]; message: string };

export function ProjectInvitationPrototype({ projects, inviter }: {
  projects: { id: string; name: string }[];
  inviter: string;
}) {
  const choices = projects.length ? projects : [{ id: "demo", name: "Sommerfilm 2026 · Eksempelprosjekt" }];
  const [projectId, setProjectId] = useState(choices[0].id);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Hei! Bli med på prosjektet vårt. Her finner du crew og oppdaterte planer for produksjonen.");
  const [access, setAccess] = useState<Access[]>(["read", "read", "read", "read", "none"]);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [stage, setStage] = useState<"email" | "register" | "done">("email");
  const [existing, setExisting] = useState(false);
  const [status, setStatus] = useState<"pending" | "active" | "revoked">("pending");
  const [notice, setNotice] = useState("");
  const preview = invitation ?? { email: email || "kollega@eksempel.no", project: choices.find(p => p.id === projectId)!.name, access, message };
  const label = preview.access.includes("write") ? "Tilpasset skrivetilgang" : "Lesetilgang";

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-muted/40 px-4 py-3 text-sm">
      <p><strong>Interaktiv prototype</strong> · Ingen e-post sendes, og ingen brukere eller tilganger lagres.</p>
      <Button variant="ghost" size="sm" onClick={() => { setInvitation(null); setStage("email"); setStatus("pending"); setNotice(""); }}>Start på nytt</Button>
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="border border-border bg-card p-5 sm:p-7">
        <p className="ap-kicker text-muted-foreground">01 / Din side · Brukertilgang</p>
        <h2 className="mt-3 text-2xl font-medium tracking-tight">Inviter til prosjekt</h2>
        <p className="mt-2 text-sm text-muted-foreground">Gi en kollega akkurat den tilgangen de trenger.</p>
        <form className="mt-7 space-y-5" onSubmit={event => {
          event.preventDefault();
          setInvitation({ email: email.trim(), project: choices.find(p => p.id === projectId)!.name, access: [...access], message });
          setStatus("pending"); setStage("email"); setNotice("Invitasjonen er klargjort i demoen. Prøv mottakerens flyt til høyre.");
        }}>
          <div className="space-y-2"><Label htmlFor="invite-email">Mottakerens e-post</Label><Input id="invite-email" type="email" placeholder="navn@firma.no" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="invite-project">Prosjekt</Label><select id="invite-project" className={nativeSelectClassName} value={projectId} onChange={e => setProjectId(e.target.value)}>{choices.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></div>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Rettigheter i dette prosjektet</legend>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAccess(["read", "read", "read", "read", "none"])}>Kun lese</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAccess(["read", "write", "write", "write", "none"])}>Bidra og redigere</Button>
            </div>
            <div className="divide-y divide-border border-y border-border">{modules.map((name, index) => <div className="flex items-center justify-between gap-3 py-3" key={name}>
              <Label htmlFor={`access-${index}`}>{name}</Label>
              <select id={`access-${index}`} className={`${nativeSelectClassName} max-w-[190px]`} value={access[index]} onChange={e => setAccess(old => old.map((value, i) => i === index ? e.target.value as Access : value))}>
                {index !== 0 && <option value="none">Ingen tilgang</option>}<option value="read">Kan lese</option>{index !== 0 && <option value="write">Kan lese og redigere</option>}
              </select>
            </div>)}</div>
          </fieldset>
          <div className="flex gap-3 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0" /><p>Gjelder bare valgt prosjekt. Ingen admin-tilgang, invitasjonsrett eller tilgang til andre prosjekter, felles crewdatabase eller sensitive personopplysninger. Prosjektinfo er skrivebeskyttet for inviterte.</p></div>
          <div className="space-y-2"><Label htmlFor="invite-message">Personlig melding</Label><textarea id="invite-message" className="min-h-24 w-full border border-input bg-card p-3 text-sm" value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} /></div>
          <Button type="submit" className="w-full"><Mail className="size-4" />{invitation ? "Oppdater demoinvitasjon" : "Send invitasjon · demo"}</Button>
        </form>
      </section>
      <section className="border border-border bg-muted/30 p-5 sm:p-7">
        <p className="ap-kicker text-muted-foreground">02 / Mottakerens opplevelse</p>
        <div className="my-4 flex flex-wrap gap-2" aria-label="Steg i mottakerens flyt">{[["email", "1. E-post"], ["register", "2. Registrering"], ["done", "3. Prosjekt"]].map(([key, text]) => <Button key={key} variant={stage === key ? "default" : "outline"} size="sm" disabled={key !== "email" && (!invitation || status === "revoked") || key === "done" && status !== "active"} onClick={() => setStage(key as typeof stage)}>{text}</Button>)}</div>
        <div className="border border-border bg-card shadow-sm">
          {stage === "email" && <div className="border-b border-border px-5 py-4 text-xs text-muted-foreground"><p>Til: {preview.email}</p><p className="mt-1">Emne: Du er invitert til {preview.project}</p></div>}
          <div className="p-6 sm:p-8">
            <ProductLockup size="lg" />
            {status === "revoked" ? <div className="mt-8 space-y-3"><h3 className="text-2xl font-medium">Invitasjonen er trukket tilbake</h3><p className="text-sm text-muted-foreground">Denne invitasjonen gir ikke lenger tilgang. Kontakt avsender for en ny invitasjon.</p></div> : stage === "email" ? <div className="mt-8 space-y-5">
              <h3 className="text-3xl font-medium tracking-tight">Du er invitert med.</h3>
              <p className="text-sm leading-relaxed"><strong>{inviter}</strong> inviterer deg til å samarbeide i WrapUp Desk.</p>
              <div className="border-l-2 border-seal bg-muted/40 p-4"><p className="ap-kicker text-muted-foreground">Ditt prosjekt</p><p className="mt-2 text-lg font-medium">{preview.project}</p><p className="mt-1 text-xs text-muted-foreground">{label} · Kun dette prosjektet</p></div>
              {preview.message && <p className="whitespace-pre-wrap text-sm leading-relaxed">{preview.message}</p>}
              <Button className="w-full" disabled={!invitation} onClick={() => setStage(status === "active" ? "done" : "register")}>Se invitasjonen <ArrowRight className="size-4" /></Button>
              <p className="text-xs leading-relaxed text-muted-foreground">Opprett din konto, eller logg inn hvis du allerede bruker WrapUp Desk. Invitasjonen er personlig og gjelder {preview.email}. Foreslått gyldighet: 7 dager.</p>
              {!invitation && <p className="text-xs text-muted-foreground">Fyll inn e-post og send demoinvitasjonen for å prøve neste steg.</p>}
            </div> : stage === "register" ? <div className="mt-8 space-y-5">
              <h3 className="text-2xl font-medium">{existing ? "Velkommen tilbake" : "Velkommen til WrapUp Desk"}</h3>
              <p className="text-sm text-muted-foreground">{existing ? "Logg inn med den inviterte e-postadressen og godta invitasjonen." : "Fullfør kontoen din for å bli med på prosjektet."}</p>
              <div className="bg-muted/40 p-4 text-sm"><strong>{preview.project}</strong><ul className="mt-3 space-y-2">{modules.map((name, i) => <li className="flex justify-between gap-2 text-xs" key={name}><span>{name}</span><span>{accessLabels[preview.access[i]]}</span></li>)}</ul></div>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); setStatus("active"); setStage("done"); setNotice("Demo: Invitasjonen er godtatt. Prosjekttilgangen vises som aktiv."); }}>
                <div className="space-y-2"><Label htmlFor="recipient-email">E-post</Label><Input id="recipient-email" value={preview.email} readOnly /></div>
                {!existing && <div className="space-y-2"><Label htmlFor="recipient-name">Fullt navn</Label><Input id="recipient-name" required placeholder="Ditt navn" autoComplete="off" /></div>}
                <p className="text-xs text-muted-foreground">I den ferdige løsningen {existing ? "logger du inn sikkert" : "velger du ditt eget passord"}. Denne demoen ber ikke om ekte passord.</p>
                <Button type="submit" className="w-full">{existing ? "Logg inn og godta · demo" : "Fullfør konto og godta · demo"}</Button>
              </form>
              <Button variant="ghost" size="sm" onClick={() => setExisting(!existing)}>{existing ? "Jeg er ny i WrapUp Desk" : "Har du allerede en konto? Logg inn"}</Button>
            </div> : <div className="mt-8 space-y-5">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted"><Check className="size-6 text-seal" /></div>
              <h3 className="text-2xl font-medium">Du er med på prosjektet.</h3><p className="text-sm text-muted-foreground">Dette er prosjektet du vil se når du logger inn.</p>
              <div className="border border-border p-4"><p className="ap-kicker text-muted-foreground">Mine prosjekter · 1 prosjekt</p><h4 className="my-3 text-xl font-medium">{preview.project}</h4><div className="space-y-2">{modules.map((name, i) => preview.access[i] !== "none" && <p className="flex justify-between gap-3 text-sm" key={name}><span>{name}</span><span className="text-xs text-muted-foreground">{accessLabels[preview.access[i]]}</span></p>)}</div></div>
              <p className="text-xs text-muted-foreground">Skjulte moduler og andre prosjekter er utilgjengelige. Tilgangen kan endres eller fjernes av administrator.</p>
            </div>}
          </div>
        </div>
      </section>
    </div>
    <p role="status" className="text-sm text-muted-foreground">{notice}</p>
    {invitation && <section className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-5"><div><p className="ap-kicker text-muted-foreground">Din side · Invitasjonsoversikt</p><p className="mt-2 font-medium">{invitation.email}</p><p className="mt-1 text-sm text-muted-foreground">{invitation.project} · {status === "active" ? "Aktiv tilgang" : status === "revoked" ? "Tilbakekalt" : "Venter på svar"}</p></div><div className="flex gap-2">{status === "pending" && <Button variant="outline" onClick={() => setNotice("Demo: Påminnelse simulert. Ingen e-post ble sendt.")}>Send på nytt · demo</Button>}{status !== "revoked" && <Button variant="outline" onClick={() => { setStatus("revoked"); setStage("email"); setNotice("Demo: Tilgangen er fjernet og invitasjonen kan ikke lenger brukes."); }}>{status === "active" ? "Fjern tilgang" : "Trekk tilbake"}</Button>}</div></section>}
    <details className="border border-border p-5 text-sm"><summary className="cursor-pointer font-medium">Hvordan konto og tilgang skal fungere i den ferdige løsningen</summary><div className="mt-4 max-w-3xl space-y-3 leading-relaxed text-muted-foreground"><p>Supabase Auth håndterer identiteten og innloggingen. En separat prosjekttilknytning bestemmer hva personen kan lese og redigere. En konto gir derfor ikke automatisk tilgang til alle prosjektene dine.</p><p>Med Supabase sin admin-invitasjon opprettes en ny Auth-bruker når invitasjonen sendes. Mottakeren følger lenken og fullfører kontoen. Eksisterende brukere bruker kontoen de allerede har. Prosjekttilknytningen aktiveres først når riktig, verifisert bruker godtar en gyldig invitasjon.</p><p>Dagens app bruker DashboardUser og egne økter. Prototypen endrer ikke denne innloggingen. Før lansering må Supabase Auth kobles til brukermodellen, og invitasjoner må få sikker tokenvalidering, utløp, tilbakekalling og serverkontroll av alle rettigheter. Tilgang må håndheves for data, nedlastinger og endringer, også når noen bruker en direkte lenke.</p></div></details>
  </div>;
}
