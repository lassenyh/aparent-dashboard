"use client";

import { useCallback, useRef, useState } from "react";
import { Contact } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseVcardText, type VcardParsed } from "@/lib/vcard";

async function readVcardFromDataTransfer(
  dt: DataTransfer | null,
): Promise<string | null> {
  if (!dt) return null;

  if (dt.files?.length) {
    const f = dt.files[0];
    const nameOk = f.name.toLowerCase().endsWith(".vcf");
    const typeOk =
      /vcard/i.test(f.type) ||
      f.type === "text/directory" ||
      f.type === "text/plain" ||
      f.type === "";
    if (nameOk || typeOk) {
      const text = await f.text();
      if (text.includes("BEGIN:VCARD")) return text;
    }
  }

  const tryTypes = [
    "text/vcard",
    "text/x-vcard",
    "application/x-vcard",
    "text/plain",
  ];
  for (const t of tryTypes) {
    if (dt.types?.includes(t)) {
      const v = dt.getData(t);
      if (v?.includes("BEGIN:VCARD")) return v;
    }
  }

  const items = dt.items ? [...dt.items] : [];
  for (const item of items) {
    if (item.kind !== "file") continue;
    const f = item.getAsFile();
    if (!f) continue;
    const text = await f.text();
    if (text.includes("BEGIN:VCARD")) return text;
  }

  return null;
}

export function VcardDropzone({
  onParsed,
  disabled,
  className,
}: {
  onParsed: (data: VcardParsed) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleText = useCallback(
    (text: string) => {
      const parsed = parseVcardText(text);
      if (!parsed) {
        toast.error("Fant ikke gyldig vCard (kontaktkort) i filen.");
        return;
      }
      onParsed(parsed);
      toast.success("Kontaktkort importert — sjekk feltene før du lagrer.");
    },
    [onParsed],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      if (disabled) return;
      const text = await readVcardFromDataTransfer(e.dataTransfer);
      if (text) {
        handleText(text);
        return;
      }
      toast.error(
        "Kunne ikke lese kontaktkort. Prøv å slippe fra Kontakter, eller velg en .vcf-fil.",
      );
    },
    [disabled, handleText],
  );

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      try {
        const text = await f.text();
        handleText(text);
      } catch {
        toast.error("Kunne ikke lese filen.");
      }
    },
    [handleText],
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center transition-colors",
        over && !disabled && "border-primary/50 bg-primary/5",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={onDrop}
    >
      <Contact
        className="mx-auto mb-2 h-8 w-8 text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm font-medium text-foreground">
        Slipp kontaktkort her (macOS Kontakter)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Dra fra Kontakter-appen, eller importer en{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          .vcf-fil
        </button>
        . Navn, e-post, telefon, by og notat hentes fra vCard-formatet.
      </p>
      <p className="mt-3 text-left text-[11px] leading-snug text-muted-foreground">
        Tips: I Safari kan du ofte dra kontaktkort direkte fra Kontakter. I Chrome
        fungerer det typisk om du først eksporterer kortet som .vcf til Mac, eller
        bruker filvelgeren over.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard,text/directory,text/plain"
        className="sr-only"
        aria-label="Velg vCard-fil"
        onChange={onFileChange}
        disabled={disabled}
      />
    </div>
  );
}
