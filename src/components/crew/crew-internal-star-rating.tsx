"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CrewInternalStarRating({
  initial,
}: {
  /** 1–5 eller null */
  initial: number | null;
}) {
  const [value, setValue] = useState<number | null>(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="internalStarRating" value={value ?? ""} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = value != null && n <= value;
            return (
              <button
                key={n}
                type="button"
                className={cn(
                  "rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-amber-500"
                    : "text-muted-foreground/40 hover:text-muted-foreground",
                )}
                onClick={() => setValue(n === value ? null : n)}
                aria-label={`${n} av 5 stjerner`}
              >
                <Star
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  strokeWidth={1.5}
                  fill={active ? "currentColor" : "none"}
                />
              </button>
            );
          })}
        </div>
        {value == null ? (
          <span className="text-xs text-muted-foreground">Ingen vurdering</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-foreground">
              {value} av 5
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setValue(null)}
            >
              Fjern
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CrewInternalStarRatingFieldset({
  initial,
}: {
  initial: number | null;
}) {
  return (
    <section
      className="rounded-lg border border-amber-900/20 bg-amber-950/[0.06] p-4 pt-5 dark:bg-amber-950/20"
      aria-labelledby="crew-internal-rating-heading"
    >
      <h3
        id="crew-internal-rating-heading"
        className="text-sm font-medium leading-none text-foreground"
      >
        Intern vurdering
      </h3>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Konfidensiell — lagres kun i crew-databasen. Vises ikke på prosjekter,
        dagsplan, call sheets, PDF eller delingslenker.
      </p>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Stjerner (1–5)</p>
        <div role="group" aria-label="Intern stjernevurdering 1–5">
          <CrewInternalStarRating initial={initial} />
        </div>
      </div>
    </section>
  );
}
