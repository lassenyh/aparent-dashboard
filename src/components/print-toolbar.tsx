"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExportWarning = {
  title: string;
  description: string;
  items: Array<{ id: string; label: string; detail?: string }>;
  cancelLabel: string;
  proceedLabel: string;
};

type PrintToolbarProps = {
  backHref?: string;
  backLabel?: string;
  /** Valgfri hjelpetekst under knappene (f.eks. utskriftsformat). */
  printHint?: string;
  /** Nedlasting (f.eks. PDF). Når satt: erstatter «Skriv ut» (f.eks. lønnsliste, dagsplan). */
  exportHref?: string;
  exportLabel?: string;
  exportWarning?: ExportWarning;
};

export function PrintToolbar({
  backHref,
  backLabel = "Tilbake til editor",
  printHint,
  exportHref,
  exportLabel,
  exportWarning,
}: PrintToolbarProps) {
  const [warningOpen, setWarningOpen] = useState(false);
  const hasExport = Boolean(exportHref?.trim());
  const showPrint = !hasExport;
  const shouldWarnBeforeExport = Boolean(exportWarning?.items.length);

  return (
    <div className="no-print mb-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {backHref ? (
          <Button variant="outline" asChild>
            <Link href={backHref}>{backLabel}</Link>
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
            shouldWarnBeforeExport ? (
              <Button
                type="button"
                variant="default"
                onClick={() => setWarningOpen(true)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {exportLabel ?? "Last ned til datamaskin"}
              </Button>
            ) : (
              <Button variant="default" asChild>
                <a href={exportHref!} download>
                  <FileDown className="mr-2 h-4 w-4" />
                  {exportLabel ?? "Last ned til datamaskin"}
                </a>
              </Button>
            )
          ) : null}
        </div>
      </div>
      {printHint?.trim() ? (
        <p className="max-w-xl text-sm text-muted-foreground">{printHint}</p>
      ) : null}

      {exportWarning ? (
        <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{exportWarning.title}</DialogTitle>
              <DialogDescription>{exportWarning.description}</DialogDescription>
            </DialogHeader>
            <ul className="max-h-56 space-y-2 overflow-y-auto border-y border-border py-3 text-sm">
              {exportWarning.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="font-medium text-foreground">{item.label}</span>
                  {item.detail ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWarningOpen(false)}
              >
                {exportWarning.cancelLabel}
              </Button>
              <Button asChild>
                <a href={exportHref!} download onClick={() => setWarningOpen(false)}>
                  <FileDown className="h-4 w-4" aria-hidden />
                  {exportWarning.proceedLabel}
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
