"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintToolbarProps = {
  backHref?: string;
  /** Valgfri hjelpetekst under knappene (f.eks. utskriftsformat). */
  printHint?: string;
  /** Nedlasting (f.eks. PDF). Når satt: erstatter «Skriv ut» (f.eks. lønnsliste, dagsplan). */
  exportHref?: string;
  exportLabel?: string;
};

export function PrintToolbar({
  backHref,
  printHint,
  exportHref,
  exportLabel,
}: PrintToolbarProps) {
  const hasExport = Boolean(exportHref?.trim());
  const showPrint = !hasExport;

  return (
    <div className="no-print mb-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {backHref ? (
          <Button variant="outline" asChild>
            <Link href={backHref}>Tilbake til editor</Link>
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {showPrint ? (
            <Button type="button" variant="default" onClick={() => window.print()}>
              Skriv ut
            </Button>
          ) : null}
          {hasExport ? (
            <Button variant="default" asChild>
              <Link href={exportHref!}>
                <FileDown className="mr-2 h-4 w-4" />
                {exportLabel ?? "Last ned til datamaskin"}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {printHint?.trim() ? (
        <p className="max-w-xl text-sm text-muted-foreground">{printHint}</p>
      ) : null}
    </div>
  );
}
