import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  /** Erstatter synlig h1 (f.eks. kundelogo som sidetittel). */
  branding,
  /** Brukes som skjult h1 når `title` er tom eller når `branding` vises. */
  screenReaderTitle,
  description,
  actions,
  className,
}: {
  title?: string;
  branding?: ReactNode;
  screenReaderTitle?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const visibleTitle = title?.trim();
  const sr = screenReaderTitle?.trim();
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {branding ? (
          <>
            <h1 className="sr-only">{sr || "Prosjekt"}</h1>
            <div className="flex flex-col items-start gap-1">{branding}</div>
          </>
        ) : visibleTitle ? (
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {visibleTitle}
          </h1>
        ) : sr ? (
          <h1 className="sr-only">{sr}</h1>
        ) : null}
        {description?.trim() ? (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
