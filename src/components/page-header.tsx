import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  kicker,
  /** Erstatter synlig h1 (f.eks. kundelogo som sidetittel). */
  branding,
  /** Brukes som skjult h1 når `title` er tom eller når `branding` vises. */
  screenReaderTitle,
  description,
  actions,
  className,
}: {
  title?: string;
  kicker?: ReactNode;
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
        "mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {kicker ? <div className="ap-kicker mb-1.5">{kicker}</div> : null}
        {branding ? (
          <>
            <h1 className="sr-only">{sr || "Prosjekt"}</h1>
            <div className="flex flex-col items-start gap-1">{branding}</div>
          </>
        ) : visibleTitle ? (
          <h1 className="ap-page-title">{visibleTitle}</h1>
        ) : sr ? (
          <h1 className="sr-only">{sr}</h1>
        ) : null}
        {description?.trim() ? (
          <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
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
