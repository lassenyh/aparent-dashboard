"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrintToolbarProps = {
  backHref?: string;
  /** Valgfri hjelpetekst under knappene (f.eks. utskriftsformat). */
  printHint?: string;
  /** Når satt: vis nedlastingslenke i stedet for «Skriv ut». */
  exportHref?: string;
  exportLabel?: string;
};

export function PrintToolbar({
  backHref,
  printHint,
  exportHref,
  exportLabel,
}: PrintToolbarProps) {
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
        {exportHref ? (
          <Button variant="default" asChild>
            <Link href={exportHref}>
              <FileDown className="mr-2 h-4 w-4" />
              {exportLabel ?? "Last ned til datamaskin"}
            </Link>
          </Button>
        ) : (
          <Button type="button" onClick={() => window.print()}>
            Skriv ut
          </Button>
        )}
      </div>
      {printHint?.trim() ? (
        <p className="max-w-xl text-sm text-muted-foreground">{printHint}</p>
      ) : null}
    </div>
  );
}
