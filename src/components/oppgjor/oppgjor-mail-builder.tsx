"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Mail, Paperclip, Pencil, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectExpensesUrl } from "@/actions/projects";
import { buildMailtoUrl } from "@/lib/befaring-mail";
import {
  buildOppgjorBodyHtml,
  buildOppgjorBodyText,
  buildOppgjorSubject,
  OPPGJOR_LINK_PLACEHOLDER,
  oppgjorLinesToEditorHtml,
  parseOppgjorText,
  serializeOppgjorEditor,
  type OppgjorMailInput,
} from "@/lib/oppgjor-mail";

/** Redigert mailtekst lagres i nettleseren per prosjekt (ikke delt mellom brukere/enheter). */
const bodyKey = (projectId: string) => `oppgjor-body:v1:${projectId}`;

function loadBody(projectId: string): string | null {
  try {
    return localStorage.getItem(bodyKey(projectId));
  } catch {
    return null;
  }
}

function storeBody(projectId: string, body: string | null) {
  try {
    if (body === null) localStorage.removeItem(bodyKey(projectId));
    else localStorage.setItem(bodyKey(projectId), body);
  } catch {
    /* Privat modus o.l. — teksten gjelder da bare til siden lukkes. */
  }
}

export type OppgjorCrewOption = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  /** Valgt som mottaker fra start (av for produsent og regissør). */
  defaultSelected: boolean;
};

type Props = {
  projectId: string;
  projectLabel: string;
  expensesUrl: string;
  canEditExpensesUrl: boolean;
  crew: OppgjorCrewOption[];
};

export function OppgjorMailBuilder({ projectId, projectLabel, expensesUrl, canEditExpensesUrl, crew }: Props) {
  /* Utleggslenke: lagret verdi på prosjektet + det som står i feltet nå. */
  const [savedUrl, setSavedUrl] = useState(expensesUrl);
  const [urlInput, setUrlInput] = useState(expensesUrl);
  const [saving, startSaving] = useTransition();
  const urlDirty = urlInput.trim() !== savedUrl;

  function saveUrl() {
    startSaving(async () => {
      const result = await updateProjectExpensesUrl(projectId, urlInput);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      /* Redigert tekst: bytt ut gammel lenke (eller plassholder) med den nye. */
      let nextBody = buildOppgjorBodyText({ projectLabel, expensesUrl: result.expensesUrl });
      if (customBody !== null) {
        const from = savedUrl || OPPGJOR_LINK_PLACEHOLDER;
        const to = result.expensesUrl || OPPGJOR_LINK_PLACEHOLDER;
        nextBody = customBody.includes(from) ? customBody.split(from).join(to) : customBody;
        setBody(nextBody, result.expensesUrl);
      }
      setSavedUrl(result.expensesUrl);
      reseedEditor(nextBody, result.expensesUrl);
      setUrlInput(result.expensesUrl);
      toast.success(result.expensesUrl ? "Utleggslenke lagret" : "Utleggslenke fjernet");
    });
  }

  /* Mottakere: alle med e-post er valgt som standard, unntatt produsent og regissør. */
  const withEmail = crew.filter((c) => c.email);
  const withoutEmail = crew.filter((c) => !c.email);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(withEmail.filter((c) => c.defaultSelected).map((c) => c.id)),
  );
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const recipients = useMemo(
    () => crew.filter((c) => c.email && selected.has(c.id)).map((c) => c.email as string),
    [crew, selected],
  );
  const allSelected = withEmail.length > 0 && recipients.length === withEmail.length;

  /* Mailtekst: malen, eller redigert versjon (null = følger malen). */
  const [customBody, setCustomBody] = useState<string | null>(() => loadBody(projectId));
  /** `url` = lenken teksten skal sammenlignes mot (malen med den lenken = ikke redigert). */
  function setBody(value: string, url = savedUrl) {
    const next = value === buildOppgjorBodyText({ projectLabel, expensesUrl: url }) ? null : value;
    setCustomBody(next);
    storeBody(projectId, next);
  }

  /*
   * Redigerbar forhåndsvisning. Innholdet styres av nettleseren mens du skriver (ellers hopper markøren);
   * React legger inn ny HTML bare ved «reseed»: lenkeendring, tilbakestilling og når feltet mister fokus.
   */
  const [editor, setEditor] = useState(() => {
    const text = customBody ?? buildOppgjorBodyText({ projectLabel, expensesUrl });
    return { key: 0, html: oppgjorLinesToEditorHtml(parseOppgjorText(text, expensesUrl)) };
  });
  function reseedEditor(text: string, url = savedUrl) {
    setEditor((e) => ({ key: e.key + 1, html: oppgjorLinesToEditorHtml(parseOppgjorText(text, url)) }));
  }

  /* Mailen bruker lagret lenke, så det som sendes alltid er det som ligger på prosjektet. */
  const mailInput: OppgjorMailInput = { projectLabel, expensesUrl: savedUrl };
  const subject = buildOppgjorSubject(mailInput);
  const defaultText = buildOppgjorBodyText(mailInput);
  const bodyText = customBody ?? defaultText;
  const lines = parseOppgjorText(bodyText, savedUrl);
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
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([buildOppgjorBodyHtml(lines)], { type: "text/html" }),
          "text/plain": new Blob([bodyText], { type: "text/plain" }),
        }),
      ]);
      toast.success("Mailtekst kopiert — lim inn i Mail");
    } catch {
      await copy(bodyText, "Mailtekst");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <section className="space-y-2">
          <Label htmlFor="oppgjor-expenses-url" className="ap-kicker">Utleggslenke (Aparent Expenses)</Label>
          {canEditExpensesUrl ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveUrl();
              }}
            >
              <Input
                id="oppgjor-expenses-url"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://…"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button type="submit" variant="outline" disabled={!urlDirty || saving}>
                <Save aria-hidden /> {saving ? "Lagrer…" : "Lagre"}
              </Button>
            </form>
          ) : (
            <p className="break-all text-sm">
              {savedUrl || <span className="text-muted-foreground">Ingen lenke lagt inn ennå.</span>}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {urlDirty
              ? "Endringen er ikke lagret. Mailen bruker lagret lenke til du trykker «Lagre»."
              : "Lagres på prosjektet, så lenken ligger klar neste gang."}
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="ap-kicker">Mottakere</h2>
            <div className="flex items-baseline gap-3">
              <span className="ap-code text-muted-foreground">{recipients.length} valgt</span>
              {withEmail.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(withEmail.map((c) => c.id)))}
                >
                  {allSelected ? "Fjern alle" : "Velg alle"}
                </Button>
              ) : null}
            </div>
          </div>
          {crew.length ? (
            <ul className="divide-y divide-border border border-border">
              {[...withEmail, ...withoutEmail].map((c) => (
                <li key={c.id}>
                  <label className={`flex items-center gap-3 px-3 py-2.5 text-sm ${c.email ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}>
                    <Checkbox
                      checked={!!c.email && selected.has(c.id)}
                      disabled={!c.email}
                      onCheckedChange={(v) => toggle(c.id, v === true)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{c.name}</span>
                      {c.role ? <span className="text-muted-foreground"> · {c.role}</span> : null}
                    </span>
                    <span className="ap-code truncate text-xs text-muted-foreground">{c.email ?? "mangler e-post"}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen i prosjektcrewet ennå.</p>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Pencil className="size-3.5" aria-hidden />
            {customBody !== null ? "Redigert — lagres i denne nettleseren" : "Klikk i teksten for å redigere"}
          </p>
          {customBody !== null ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBody(defaultText);
                reseedEditor(defaultText);
              }}
            >
              <RotateCcw aria-hidden /> Tilbakestill til mal
            </Button>
          ) : null}
        </div>
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
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 px-4 py-2.5">
              <dt className="text-muted-foreground">Vedlegg</dt>
              <dd className="flex items-start gap-1.5 text-muted-foreground">
                <Paperclip className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Legg ved fakturainfo (PDF) og timelistemal i Mail
              </dd>
            </div>
          </dl>
          <div
            key={editor.key}
            role="textbox"
            aria-multiline="true"
            aria-label="Mailtekst"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            className="min-h-48 border-t border-border [&_a]:cursor-default [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_b]:font-semibold px-4 py-4 text-sm leading-relaxed outline-none transition-colors hover:bg-muted/20 focus:bg-background focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
            dangerouslySetInnerHTML={{ __html: editor.html }}
            onInput={(e) => setBody(serializeOppgjorEditor(e.currentTarget))}
            onBlur={(e) => reseedEditor(serializeOppgjorEditor(e.currentTarget))}
            onPaste={(e) => {
              /* Bare ren tekst inn, så formateringen styres av malen. */
              e.preventDefault();
              document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
            }}
          />
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
          «Åpne i Mail» lager et nytt utkast med mottakere, emne og tekst, men bare ren tekst: utleggslenken vises som adresse.
          Vil du ha uthevede overskrifter og «Aparent Utlegg» som klikkbar tittel: bruk «Kopier tekst» og lim inn i utkastet.
          Vedleggene drar du inn selv.
        </p>
      </aside>
    </div>
  );
}
