"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { searchLocationPlaces, getLocationPlace } from "@/actions/google-places";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Suggestion = { placeId: string; label: string };
type Place = {
  locationName: string;
  locationText: string;
  locationMapsUrl: string;
  latitude: number | null;
  longitude: number | null;
};

export function LocationPlaceSearch({ projectId, onSelect, label = "Søk etter sted eller adresse", selectedMessage = "Adresse og Google Maps-lenke er fylt inn.", placeholder = "Søk i Google Maps…", action }: {
  projectId: string;
  onSelect: (place: Place) => void;
  label?: string;
  selectedMessage?: string;
  placeholder?: string;
  action?: ReactNode;
}) {
  const id = useId();
  const token = useRef("");
  const version = useRef(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || query.trim().length < 3) return;
    const request = ++version.current;
    let cancelled = false;
    const timer = setTimeout(async () => {
      token.current ||= crypto.randomUUID();
      setBusy(true);
      try {
        const result = await searchLocationPlaces(projectId, query, token.current);
        if (cancelled || request !== version.current) return;
        setSuggestions(result.suggestions ?? []);
        setMessage(result.error ?? (result.suggestions?.length ? "" : "Ingen treff. Prøv en annen adresse."));
      } catch {
        if (!cancelled && request === version.current) setMessage("Kunne ikke søke. Prøv igjen.");
      } finally {
        if (!cancelled && request === version.current) setBusy(false);
      }
    }, 300);
    return () => { clearTimeout(timer); cancelled = true; };
  }, [query, open, projectId]);

  async function select(suggestion: Suggestion) {
    version.current++;
    setOpen(false);
    setSelecting(true);
    setMessage("");
    try {
      const result = await getLocationPlace(projectId, suggestion.placeId, token.current);
      if (result.place) {
        onSelect(result.place);
        setQuery("");
        setSuggestions([]);
        token.current = "";
        setMessage(selectedMessage);
      } else setMessage(result.error ?? "Kunne ikke hente stedet.");
    } catch { setMessage("Kunne ikke hente stedet. Prøv igjen."); }
    finally { setSelecting(false); setBusy(false); }
  }

  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex items-stretch gap-3">
      <div className="relative min-w-0 flex-1">
        <Input id={id} role="combobox" autoComplete="off" value={query} disabled={selecting}
          placeholder={placeholder} aria-expanded={open && suggestions.length > 0}
          aria-controls={`${id}-results`} aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
          onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          onChange={(e) => { version.current++; setQuery(e.target.value); setSuggestions([]); setMessage(""); setActive(-1); setBusy(false); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); return; }
            if (e.key === "Enter") { e.preventDefault(); if (open && active >= 0 && suggestions[active]) void select(suggestions[active]); }
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && suggestions.length) {
              e.preventDefault(); setOpen(true);
              setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
            }
          }} />
        {open && suggestions.length > 0 && <div className="absolute z-30 w-full border border-border bg-background shadow-md">
          <ul id={`${id}-results`} role="listbox" aria-label="Stedsforslag">
            {suggestions.map((suggestion, i) => <li key={suggestion.placeId} id={`${id}-option-${i}`}
              role="option" aria-selected={active === i} className={`cursor-pointer px-3 py-3 text-sm hover:bg-muted ${active === i ? "bg-muted" : ""}`}
              onMouseDown={(e) => e.preventDefault()} onClick={() => void select(suggestion)}>{suggestion.label}</li>)}
          </ul>
          <div translate="no" className="border-t px-3 py-2 text-right font-sans text-xs font-normal tracking-normal text-[#5e5e5e]">Google Maps</div>
        </div>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    <p role="status" className="text-xs text-muted-foreground">{selecting ? "Henter adresse…" : busy && open ? "Søker…" : message}</p>
  </div>;
}
