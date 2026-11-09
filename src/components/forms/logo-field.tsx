"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImageUp, Trash2, Undo2, X } from "lucide-react";
import { PublicLogoImg } from "@/components/public-logo-img";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { sanitizePublicImageUrl } from "@/lib/img-url";

const ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Logo-opplasting med forhåndsvisning: valgt fil vises før lagring, og kan avbrytes.
 * Sender `logoFile` (og `removeLogo=1` når nåværende logo skal fjernes) med skjemaet.
 * Gi komponenten ny `key` etter vellykket lagring for å nullstille forhåndsvisningen.
 */
export function LogoField({
  currentUrl,
  label = "Logo",
}: {
  currentUrl?: string | null;
  label?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState("");
  /** Nåværende logo skal fjernes ved lagring. */
  const [removing, setRemoving] = useState(false);

  /* Knappeklikk utløser ikke input/change — gi skjemaet beskjed så lagre-knappen våkner. */
  function notifyForm(el: HTMLElement) {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const hasCurrent = !!sanitizePublicImageUrl(currentUrl);

  /* Frigjør forrige forhåndsvisning (object URL) når den byttes eller komponenten fjernes. */
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  function clearFile() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    if (!file) {
      setPreview(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Filen er større enn 2 MB. Velg en mindre fil.");
      clearFile();
      return;
    }
    setRemoving(false);
    setPreview({ url: URL.createObjectURL(file), name: file.name });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="space-y-3 border border-border bg-muted/20 px-4 py-3">
        {preview ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              Ny logo — ikke lagret ennå
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- lokal forhåndsvisning (blob:) */}
              <img src={preview.url} alt="Forhåndsvisning av ny logo" className="h-12 max-w-[200px] object-contain object-left" />
              {hasCurrent ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>erstatter</span>
                  <PublicLogoImg src={currentUrl} alt="Nåværende logo" className="h-6 max-w-[100px] object-contain object-left opacity-50" />
                </div>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{preview.name}</p>
          </div>
        ) : hasCurrent && removing ? (
          <p className="text-xs font-medium text-foreground">Logoen fjernes når du lagrer.</p>
        ) : hasCurrent ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Nåværende logo</p>
            <PublicLogoImg src={currentUrl} alt="" className="h-12 max-w-[200px] object-contain object-left" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Ingen logo.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={id}
            name="logoFile"
            type="file"
            accept={ACCEPT}
            onChange={onPick}
            className="sr-only"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <ImageUp aria-hidden /> {preview ? "Velg en annen" : hasCurrent && !removing ? "Last opp ny logo" : "Last opp logo"}
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearFile}>
              <X aria-hidden /> Avbryt
            </Button>
          ) : hasCurrent && removing ? (
            <>
              <input type="hidden" name="removeLogo" value="1" />
              <Button type="button" variant="ghost" size="sm"
                onClick={(e) => { notifyForm(e.currentTarget); setRemoving(false); }}>
                <Undo2 aria-hidden /> Angre
              </Button>
            </>
          ) : hasCurrent ? (
            <Button type="button" variant="ghost" size="sm"
              onClick={(e) => { notifyForm(e.currentTarget); setRemoving(true); }}>
              <Trash2 aria-hidden /> Fjern logo
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG, SVG, WebP eller GIF (maks 2 MB).</p>
    </div>
  );
}
