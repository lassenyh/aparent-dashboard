"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  SCHEDULE_ROW_COLOR_PRESETS,
  normalizeScheduleRowBgColor,
} from "@/lib/schedule-row-colors";
import { cn } from "@/lib/utils";

export function ScheduleRowColorPopover({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const normalized = normalizeScheduleRowBgColor(value);
  const pickerValue = normalized || "#ffffff";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Radfarge"
          aria-label="Velg radfarge"
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-muted/40 transition-colors hover:bg-muted",
            normalized && "border-neutral-400",
          )}
        >
          {normalized ? (
            <span
              className="h-3.5 w-3.5 rounded-sm border border-black/10 shadow-sm"
              style={{ backgroundColor: normalized }}
            />
          ) : (
            <Palette className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {SCHEDULE_ROW_COLOR_PRESETS.map((p, i) => {
              const selected = p.hex
                ? normalized === p.hex
                : !normalized;
              return (
                <button
                  key={p.hex || `default-${i}`}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  onClick={() => onChange(p.hex)}
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-md border-2 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-foreground shadow-sm ring-2 ring-ring ring-offset-2"
                      : "border-border hover:border-muted-foreground/50",
                    !p.hex &&
                      "bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:8px_8px]",
                  )}
                  style={
                    p.hex
                      ? { backgroundColor: p.hex }
                      : undefined
                  }
                />
              );
            })}
          </div>
          <div>
            <Label htmlFor="schedule-row-custom-color" className="text-xs text-muted-foreground">
              Egen farge
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="schedule-row-custom-color"
                type="color"
                value={pickerValue}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-background p-0.5"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onChange("")}
              >
                Fjern farge
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
