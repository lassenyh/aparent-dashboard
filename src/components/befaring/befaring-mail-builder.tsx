"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Mail, Plus, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPlaceSearch } from "@/components/dagsplan/location-place-search";
import { buildGoogleMapsSearchUrl } from "@/lib/google-maps-url";
import {
  loadBefaringDraft,
  useBefaringAutosave,
  type BefaringDraft,
  type BefaringDraftLocation,
} from "@/components/befaring/befaring-draft";
import {
  buildBefaringBodyHtml,
  buildBefaringBodyText,
  buildBefaringLines,
  buildBefaringSubject,
  buildMailtoUrl,
  locationLine,
  type BefaringCrewOption,
  type BefaringLocationOption,
  type BefaringMailInput,
} from "@/lib/befaring-mail";

type Props = {
  projectId: string;
  projectLabel: string;
  today: string;
  defaultDate: string;
  crew: BefaringCrewOption[];
  locations: BefaringLocationOption[];
  canSearchPlaces: boolean;
};

type Draft = { date: string; time: string; transport: string };

const DEFAULT_CLOSING = "Alt godt,";
const TRANSPORT_PLACEHOLDER = "Mikkel kjører med Kavar etter PPM.\nSindre tar med Niels, Martin og Johan. Filip kjører selv.";

export function BefaringMailBuilder({
  projectId,
  projectLabel,
  today,
  defaultDate,
  crew,
  locations: initialLocations,
  canSearchPlaces,
}: Props) {
  /* Utgangspunkt fra prosjektdata. */
  const initial = (): BefaringDraft => ({
    date: defaultDate,
    time: "",
    transport: "",
    selected: crew.filter((c) => c.matched && c.group === "standard" && c.email).map((c) => c.id),
    locations: initialLocations.map((l) => ({ ...l, included: l.defaultIncluded })),
  });

  /* Lagret utkast i nettleseren (komponenten rendres kun i klienten, se loaderen). */
  const [restored] = useState(() => {
    const saved = loadBefaringDraft(projectId);
    if (!saved) return null;
    const base = initial();
    const crewIds = new Set(crew.filter((c) => c.email).map((c) => c.id));
    const savedLocIds = new Set(saved.locations.map((l) => l.id));
    return {
      savedAt: saved.savedAt,
      draft: {
        date: saved.date || base.date,
        time: saved.time,
        transport: saved.transport,
        selected: saved.selected.filter((id) => crewIds.has(id)),
        /* Nye lokasjoner fra dagsplaner siden sist legges til, men uten avkryssing. */
        locations: [
          ...saved.locations,
          ...base.locations.filter((l) => !savedLocIds.has(l.id)).map((l) => ({ ...l, included: false })),
        ],
      } satisfies BefaringDraft,
    };
  });
  const start = restored?.draft ?? initial();

  const [draft, setDraft] = useState<Draft>({ date: start.date, time: start.time, transport: start.transport });
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  /* Mottakere */
  const [selected, setSelected] = useState<Set<string>>(() => new Set(start.selected));
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const standard = crew.filter((c) => c.matched && c.group === "standard");
  const optional = crew.filter((c) => c.matched && c.group === "optional");
  const others = crew.filter((c) => !c.matched && c.email);

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of crew) {
      if (!selected.has(c.id) || !c.email) continue;
      const key = c.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c.email);
    }
    return out;
  }, [crew, selected]);

  /* Lokasjoner */
  const [locations, setLocations] = useState<BefaringDraftLocation[]>(() => start.locations);

  /* Autolagring hvert 30. sekund + advarsel ved forlating med ulagrede endringer. */
  const autosave = useBefaringAutosave(
    projectId,
    { ...draft, selected: [...selected].sort(), locations },
    restored?.savedAt ?? null,
  );
  const router = useRouter();
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  function leave(save: boolean) {
    const target = autosave.leaveTarget;
    if (!target) return;
    if (save && !autosave.saveNow()) {
      toast.error("Kunne ikke lagre utkastet");
      return;
    }
    autosave.cancelLeave();
    router.push(target);
  }
  function startOver() {
    setConfirmStartOver(false);
    const fresh = initial();
    setDraft({ date: fresh.date, time: fresh.time, transport: fresh.transport });
    setSelected(new Set(fresh.selected));
    setLocations(fresh.locations);
    autosave.reset({ ...fresh, selected: [...fresh.selected].sort() });
  }
  const patchLocation = (id: string, patch: Partial<BefaringDraftLocation>) =>
    setLocations((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLocation = (loc?: { name: string; address: string; mapsUrl: string | null }) =>
    setLocations((ls) => [
      ...ls,
      {
        id: `manual-${crypto.randomUUID()}`,
        name: loc?.name ?? "",
        address: loc?.address ?? "",
        mapsUrl: loc?.mapsUrl ?? null,
        source: "",
        defaultIncluded: true,
        included: true,
      },
    ]);

  const mailLocations = locations
    .filter((l) => l.included)
    .map((l) => ({
      ...l,
      /* Manuelt redigert adresse uten lenke → søkelenke. */
      mapsUrl: l.mapsUrl || buildGoogleMapsSearchUrl(l.address || l.name),
    }));

  const mailInput: BefaringMailInput = {
    date: draft.date,
    time: draft.time,
    projectLabel,
    transport: draft.transport,
    locations: mailLocations,
    closing: DEFAULT_CLOSING,
    today,
  };
  const subject = buildBefaringSubject(mailInput);
  const bodyText = buildBefaringBodyText(mailInput);
  const mailto = buildMailtoUrl(recipients, subject, bodyText);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopiert`);
    } catch {
      toast.error("Kunne ikke kopiere");
    }
  }

  async function copyFormatted() {
    const html = buildBefaringBodyHtml(mailInput);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([bodyText], { type: "text/plain" }),
        }),
      ]);
      toast.success("Mailtekst kopiert med lenker — lim inn i Mail");
    } catch {
      await copy(bodyText, "Mailtekst");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/20 px-3 py-2">
          <p role="status" className="text-xs text-muted-foreground">
            {autosave.dirty
              ? "Ulagrede endringer — lagres automatisk hvert 30. sekund"
              : autosave.savedAt
                ? `Utkast lagret ${formatSavedAt(autosave.savedAt)} (kun i denne nettleseren)`
                : "Ingen endringer"}
          </p>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={!autosave.dirty}
              onClick={() => { if (autosave.saveNow()) toast.success("Utkast lagret"); else toast.error("Kunne ikke lagre utkastet"); }}>
              <Save aria-hidden /> Lagre nå
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmStartOver(true)}
              disabled={!autosave.dirty && !autosave.savedAt}>
              <RotateCcw aria-hidden /> Start på nytt
            </Button>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="ap-kicker">Når</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="befaring-date">Dato</Label>
              <Input
                id="befaring-date"
                type="date"
                value={draft.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="befaring-time">Oppmøte (valgfritt)</Label>
              <Input
                id="befaring-time"
                type="time"
                value={draft.time}
                onChange={(e) => update("time", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="befaring-transport" className="ap-kicker">Transport</Label>
          <Textarea
            id="befaring-transport"
            rows={3}
            placeholder={TRANSPORT_PLACEHOLDER}
            value={draft.transport}
            onChange={(e) => update("transport", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Tomt felt = transport utelates fra mailen.</p>
        </section>

        <section className="space-y-3">
          <h2 className="ap-kicker">Lokasjoner</h2>
          {locations.length ? (
            <ul className="divide-y divide-border border border-border">
              {locations.map((loc) => (
                <li key={loc.id} className="flex gap-3 p-3">
                  <Checkbox
                    className="mt-2.5"
                    checked={loc.included}
                    onCheckedChange={(v) => patchLocation(loc.id, { included: v === true })}
                    aria-label={`Ta med ${locationLine(loc) || "lokasjon"}`}
                  />
                  <div className={`grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${loc.included ? "" : "opacity-50"}`}>
                    <Input
                      aria-label="Navn"
                      placeholder="Navn (f.eks. Butikk – Coop Harbitz)"
                      value={loc.name}
                      onChange={(e) => patchLocation(loc.id, { name: e.target.value })}
                    />
                    <Input
                      aria-label="Adresse"
                      placeholder="Adresse"
                      value={loc.address}
                      onChange={(e) => patchLocation(loc.id, { address: e.target.value, mapsUrl: null })}
                    />
                    {loc.source ? (
                      <p className="text-xs text-muted-foreground sm:col-span-2">Fra dagsplan: {loc.source}</p>
                    ) : null}
                  </div>
                  {!loc.source ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Fjern lokasjon"
                      onClick={() => setLocations((ls) => ls.filter((l) => l.id !== loc.id))}
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ingen lokasjoner i prosjektets dagsplaner. Legg til under.
            </p>
          )}
          {canSearchPlaces ? (
            <LocationPlaceSearch
              projectId={projectId}
              label="Legg til lokasjon"
              selectedMessage="Lokasjon lagt til."
              onSelect={(place) =>
                addLocation({
                  name: place.locationName,
                  address: place.locationText,
                  mapsUrl: place.locationMapsUrl,
                })
              }
              action={
                <Button type="button" variant="outline" onClick={() => addLocation()}>
                  <Plus className="size-4" /> Manuelt
                </Button>
              }
            />
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => addLocation()}>
              <Plus className="size-4" /> Legg til lokasjon
            </Button>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="ap-kicker">Mottakere</h2>
            <span className="ap-code text-muted-foreground">{recipients.length} valgt</span>
          </div>
          <RecipientGroup title="Fast invitert" rows={standard} selected={selected} onToggle={toggle}
            empty="Ingen i crewlisten har roller som alltid inviteres." />
          {optional.length ? (
            <RecipientGroup title="Valgfritt" rows={optional} selected={selected} onToggle={toggle} />
          ) : null}
          {others.length ? (
            <details className="group" open>
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Øvrig crew ({others.length})
              </summary>
              <div className="pt-2">
                <RecipientGroup rows={others} selected={selected} onToggle={toggle} />
              </div>
            </details>
          ) : null}
        </section>

      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="border border-border bg-card shadow-sm">
          <dl className="divide-y divide-border text-sm">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 px-4 py-2.5">
              <dt className="text-muted-foreground">Til</dt>
              <dd className="break-words">
                {recipients.length ? recipients.join(", ") : <span className="text-muted-foreground">Ingen mottakere valgt</span>}
              </dd>
            </div>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 px-4 py-2.5">
              <dt className="text-muted-foreground">Emne</dt>
              <dd className="font-medium">{subject}</dd>
            </div>
          </dl>
          <div className="border-t border-border px-4 py-4 text-sm leading-relaxed">
            <MailPreview input={mailInput} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border bg-muted/20 px-4 py-3">
            <Button asChild>
              <a href={mailto}>
                <Mail className="size-4" /> Åpne i Mail
              </a>
            </Button>
            <Button type="button" variant="outline" onClick={copyFormatted}>
              <Copy className="size-4" /> Kopier tekst
            </Button>
            <Button type="button" variant="ghost" onClick={() => copy(recipients.join(", "), "Mottakere")} disabled={!recipients.length}>
              Kopier mottakere
            </Button>
            <Button type="button" variant="ghost" onClick={() => copy(subject, "Emne")}>
              Kopier emne
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          «Åpne i Mail» lager et nytt utkast med mottakere, emne og tekst (Maps-lenker vises som URL).
          Vil du ha uthevede titler og «Google Maps» som klikkbar tekst: bruk «Kopier tekst» og lim inn i utkastet.
        </p>
      </aside>
      <Dialog open={!!autosave.leaveTarget} onOpenChange={(open) => { if (!open) autosave.cancelLeave(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ulagrede endringer</DialogTitle>
            <DialogDescription>
              Du har endringer i teknisk befaring som ikke er lagret. Vil du lagre før du går videre?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" onClick={() => leave(true)}>
              <Save aria-hidden /> Lagre og gå videre
            </Button>
            <Button type="button" variant="outline" onClick={() => leave(false)}>
              Forlat uten å lagre
            </Button>
            <Button type="button" variant="ghost" onClick={autosave.cancelLeave}>
              Lukk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmStartOver} onOpenChange={setConfirmStartOver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Starte på nytt?</DialogTitle>
            <DialogDescription>
              Det lagrede utkastet slettes, og skjemaet fylles ut på nytt fra prosjektdata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" onClick={startOver}>
              <RotateCcw aria-hidden /> Start på nytt
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmStartOver(false)}>
              Avbryt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = d.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("nb-NO", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

function RecipientGroup({
  title,
  rows,
  selected,
  onToggle,
  empty,
}: {
  title?: string;
  rows: BefaringCrewOption[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  empty?: string;
}) {
  return (
    <div className="space-y-1.5">
      {title ? <p className="text-xs font-medium text-muted-foreground">{title}</p> : null}
      {rows.length ? (
        <ul className="divide-y divide-border border border-border">
          {rows.map((c) => (
            <li key={c.id}>
              <label className={`flex items-center gap-3 px-3 py-2.5 text-sm ${c.email ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}>
                <Checkbox
                  checked={!!c.email && selected.has(c.id)}
                  disabled={!c.email}
                  onCheckedChange={(v) => onToggle(c.id, v === true)}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground"> · {c.role || c.ruleLabel || "Ingen rolle"}</span>
                </span>
                <span className="ap-code truncate text-xs text-muted-foreground">
                  {c.email ?? "mangler e-post"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : null}
    </div>
  );
}

function MailPreview({ input }: { input: BefaringMailInput }) {
  return (
    <div>
      {buildBefaringLines(input).map((line, i) =>
        line.kind === "text" ? (
          <p key={i} className="min-h-[1.625em] whitespace-pre-wrap">{line.text}</p>
        ) : line.kind === "field" ? (
          <p key={i}>
            <strong className="font-semibold">{line.label}</strong>{line.text ? ` ${line.text}` : null}
          </p>
        ) : (
          <p key={i}>
            <strong className="font-semibold">Location {line.index}:</strong>{" "}
            <span>
              {line.text}
              {line.mapsUrl ? (
                <>
                  {" ("}
                  <a href={line.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Google Maps
                  </a>
                  {")"}
                </>
              ) : null}
            </span>
          </p>
        ),
      )}
    </div>
  );
}
