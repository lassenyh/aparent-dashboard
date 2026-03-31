"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  deactivateProjectCrew,
  submitProjectCrewRow,
} from "@/actions/projects";
import type { ProjectCrewRowClient } from "@/lib/serialize";
import { cn } from "@/lib/utils";
import { nativeSelectClassName } from "@/lib/form-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { rows: ProjectCrewRowClient[] };

export function ProjectCrewList({ rows }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!rows.length) return null;

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => {
        const isOpen = expandedId === row.id;
        const metaParts: string[] = [];
        if (row.person.phone) metaParts.push(row.person.phone);
        if (row.notes?.trim()) metaParts.push("Notat");
        const meta =
          metaParts.length > 0 ? ` · ${metaParts.join(" · ")}` : "";

        return (
          <div key={row.id}>
            <div className="flex min-h-[40px] items-stretch gap-1 py-2">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={
                  isOpen
                    ? `Lukk redigering for ${row.person.fullName}`
                    : `Rediger ${row.person.fullName}`
                }
                onClick={() =>
                  setExpandedId((id) => (id === row.id ? null : row.id))
                }
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left transition-colors -mx-2",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isOpen && "bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight text-foreground">
                    {row.person.fullName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.effectiveRole}
                    {meta}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-sm text-foreground">
                  {row.effectiveRateLabel}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              <form
                action={deactivateProjectCrew.bind(null, row.id)}
                className="flex shrink-0 items-center"
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                  title="Fjern fra prosjekt"
                >
                  Fjern
                </Button>
              </form>
            </div>

            {isOpen ? (
              <form
                action={submitProjectCrewRow.bind(null, row.id)}
                className="mb-2 ml-2 border-l-2 border-border pl-4"
              >
                <div className="rounded-md bg-muted/25 px-4 py-3">
                  <p className="mb-3 text-xs text-muted-foreground">
                    <Link
                      href={`/crew/${row.person.id}`}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Åpne profil
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </p>
                  <div className="grid max-w-lg gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Rolle (override)
                      </Label>
                      <Input
                        name="roleOverride"
                        placeholder={row.suggestedRolePrimary}
                        defaultValue={row.roleOverride ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Sats (override, NOK)
                      </Label>
                      <Input
                        name="rateOverride"
                        type="number"
                        min={0}
                        step={1}
                        placeholder={
                          row.person.defaultRate != null
                            ? String(row.person.defaultRate)
                            : ""
                        }
                        defaultValue={
                          row.rateOverride != null
                            ? String(row.rateOverride)
                            : ""
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Satstype
                      </Label>
                      <select
                        name="rateTypeOverride"
                        className={nativeSelectClassName}
                        defaultValue={
                          row.rateTypeOverride != null
                            ? row.rateTypeOverride
                            : "__inherit__"
                        }
                      >
                        <option value="__inherit__">Fra person</option>
                        <option value="day">Dag</option>
                        <option value="hour">Time</option>
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        Notat
                      </Label>
                      <Input name="notes" defaultValue={row.notes ?? ""} />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button type="submit" size="sm" variant="secondary">
                      Lagre
                    </Button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
