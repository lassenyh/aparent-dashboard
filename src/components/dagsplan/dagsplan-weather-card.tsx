"use client";

import type { WeatherIconKind } from "@prisma/client";
import { WeatherIconGlyph } from "@/lib/weather-icon";
import { cn } from "@/lib/utils";

function formatTempLine(
  min: number | null,
  max: number | null,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}° / ${max}°`;
  if (min != null) return `Lav ${min}°`;
  return `Høy ${max}°`;
}

export function DagsplanWeatherCard({
  weatherIcon,
  weatherTempMin,
  weatherTempMax,
  weatherText,
  variant = "editor",
  className,
}: {
  weatherIcon: WeatherIconKind;
  weatherTempMin: number | null;
  weatherTempMax: number | null;
  weatherText: string | null | undefined;
  variant?: "editor" | "print";
  className?: string;
}) {
  const text = weatherText?.trim() ?? "";
  const tempLine = formatTempLine(weatherTempMin, weatherTempMax);
  const showIcon = weatherIcon !== "none";
  if (!showIcon && !tempLine && !text) return null;

  const isPrint = variant === "print";
  const box = isPrint
    ? "rounded-lg border border-neutral-200 bg-white px-3 py-3 text-neutral-900 print:border-neutral-300"
    : "rounded-lg border border-border bg-muted/30 px-3 py-3 text-foreground";

  return (
    <div className={cn(box, className)}>
      <div className="flex flex-wrap items-center gap-3">
        {showIcon ? (
          <WeatherIconGlyph
            kind={weatherIcon}
            className={cn(
              isPrint
                ? "text-neutral-800 print:h-7 print:w-7"
                : "text-foreground",
            )}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          {tempLine ? (
            <p
              className={
                isPrint
                  ? "text-[11px] font-medium tabular-nums text-neutral-950 print:text-[10px]"
                  : "text-sm font-medium tabular-nums"
              }
            >
              {tempLine}
            </p>
          ) : null}
          {text ? (
            <p
              className={cn(
                "whitespace-pre-wrap",
                isPrint
                  ? "text-[11px] leading-relaxed text-neutral-800 print:text-[10px]"
                  : "text-sm leading-relaxed",
              )}
            >
              {text}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
