"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Markør for «ingen endringer gjort ennå». */
const UNTOUCHED = Symbol("untouched");

/**
 * Lagre-knapp som viser skjemaets tilstand:
 * - ingen endringer siden åpning/siste lagring → «✓ Lagret» (dempet, ikke klikkbar)
 * - endringer i skjemaet → «Lagre»
 * - under lagring → «Lagrer…»
 * Lytter på input/change i skjemaet knappen står i.
 */
export function SaveButton({
  pending,
  savedAt,
  failed = false,
  label = "Lagre",
  size,
  children,
}: {
  pending: boolean;
  /** Tidsstempel (ms) fra siste vellykkede lagring; endres for hver lagring. */
  savedAt: number | null | undefined;
  /** Siste lagring feilet — behold «Lagre» så man kan prøve igjen. */
  failed?: boolean;
  label?: string;
  size?: "sm" | "default";
  /** Andre knapper (f.eks. «Tilbake») ved siden av. */
  children?: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  /* Hvilken lagring endringene ble gjort etter. Ny lagring → ulik verdi → skjemaet er «rent» igjen. */
  const [editedAfter, setEditedAfter] = useState<number | null | undefined | typeof UNTOUCHED>(UNTOUCHED);
  const savedAtRef = useRef(savedAt);
  useEffect(() => {
    savedAtRef.current = savedAt;
  });

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onEdit = () => setEditedAfter(savedAtRef.current ?? null);
    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    return () => {
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
    };
  }, []);

  const dirty = failed || (editedAfter !== UNTOUCHED && editedAfter === (savedAt ?? null));

  return (
    <>
      <Button
        ref={ref}
        type="submit"
        size={size}
        variant={dirty || pending ? "default" : "outline"}
        disabled={pending || !dirty}
        className="min-w-[96px] disabled:opacity-100"
      >
        {pending ? (
          "Lagrer…"
        ) : dirty ? (
          label
        ) : (
          <>
            <Check aria-hidden /> Lagret
          </>
        )}
      </Button>
      {children}
    </>
  );
}
