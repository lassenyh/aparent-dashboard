"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchBrreg } from "@/actions/brreg";
import type { BrregOrganization } from "@/lib/brreg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrregSearch({ onSelect, disabled = false }: {
  onSelect: (organization: BrregOrganization) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<BrregOrganization[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const requests = requestId;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      requests.current++;
    };
  }, [disabled]);

  async function search(value = query) {
    if (timer.current) clearTimeout(timer.current);
    if (disabled || value.trim().length < 2) return;
    const request = ++requestId.current;
    setPending(true);
    setHits([]);
    setMessage("");
    try {
      const result = await searchBrreg(value);
      if (request !== requestId.current) return;
      setHits(result.organizations);
      setMessage(result.error ?? (result.organizations.length
        ? `${result.organizations.length} treff. Velg en virksomhet nedenfor.`
        : "Ingen treff. Prøv et annet navn eller organisasjonsnummer, eller fyll ut manuelt."));
    } catch {
      if (request === requestId.current) setMessage("Kunne ikke søke i Brønnøysundregistrene. Prøv igjen eller fyll ut manuelt.");
    } finally {
      if (request === requestId.current) setPending(false);
    }
  }

  return (
    <div className="space-y-2 border-b border-border pb-6">
      <Label htmlFor={id}>Søk i Brønnøysundregistrene</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={query}
          disabled={disabled}
          maxLength={180}
          placeholder="Firmanavn eller organisasjonsnummer"
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            const value = event.target.value;
            if (timer.current) clearTimeout(timer.current);
            requestId.current++;
            setQuery(value);
            setPending(value.trim().length >= 2);
            setHits([]);
            setMessage("");
            if (value.trim().length >= 2) {
              timer.current = setTimeout(() => void search(value), 350);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={disabled || pending || query.trim().length < 2} onClick={() => void search()}>
          {pending ? "Søker…" : "Søk"}
        </Button>
      </div>
      <p id={`${id}-help`} className="ap-help">Søker automatisk fra to tegn. Velg en virksomhet for å fylle ut skjemaet, eller skriv inn manuelt.</p>
      <p role="status" className="text-[12px] text-muted-foreground">{pending ? "Søker i Brønnøysundregistrene…" : message}</p>
      {hits.length ? (
        <ul className="max-h-72 overflow-y-auto divide-y divide-border-hairline border border-border bg-card" aria-label="Virksomheter fra Brønnøysundregistrene">
          {hits.map((hit) => (
            <li key={hit.organizationNumber}>
              <button type="button" disabled={disabled} className="w-full px-3 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-foreground disabled:opacity-50" onClick={() => {
                if (timer.current) clearTimeout(timer.current);
                requestId.current++;
                setPending(false);
                onSelect(hit);
                setHits([]);
                setMessage(`Valgt: ${hit.name}. Du kan redigere opplysningene før du lagrer.`);
              }}>
                <span className="block text-[13px] font-medium">{hit.name}</span>
                <span className="ap-code block text-[11px] text-muted-foreground">{hit.organizationNumber}{hit.city ? ` · ${hit.city}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
