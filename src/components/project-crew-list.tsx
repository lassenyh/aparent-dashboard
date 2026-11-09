"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { SaveButton } from "@/components/save-button";
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

type Props = {
  rows: ProjectCrewRowClient[];
  canEdit?: boolean;
  canEditRates?: boolean;
  canOpenProfile?: boolean;
  /** Fjerner raden fra visningen umiddelbart (kalles inne i form-action-transition). */
  onOptimisticRemove?: (projectCrewId: string) => void;
};

/** Rader lagt til optimistisk har midlertidig id til serveren har svart. */
const isPendingRow = (row: ProjectCrewRowClient) => row.id.startsWith("optimistic-");

function ProjectRoleField({ row }: { row: ProjectCrewRowClient }) {
  const id = useId();
  const roles = [...new Set(row.person.roles.map((role) => role.trim()).filter(Boolean))];
  const initialIndex = row.roleOverride ? roles.indexOf(row.roleOverride) : -1;
  const [choice, setChoice] = useState(row.roleOverride ? (initialIndex === 0 ? "inherit" : initialIndex > 0 ? String(initialIndex) : "custom") : "inherit");
  const [customRole, setCustomRole] = useState(row.roleOverride ?? (roles.length <= 1 ? roles[0] ?? "" : ""));

  if (roles.length <= 1) return <div className="space-y-2">
    <Label htmlFor={id} className="text-xs text-muted-foreground">Rolle i dette prosjektet</Label>
    <Input id={id} value={customRole} placeholder="Skriv rollen" onChange={(event) => setCustomRole(event.target.value)} />
    <input type="hidden" name="roleOverride" value={customRole === (row.roleOverride ?? roles[0] ?? "") ? row.roleOverride ?? "" : customRole} />
    <p className="text-xs text-muted-foreground">Gjelder kun dette prosjektet.</p>
  </div>;

  return <div className="space-y-2">
    <Label htmlFor={id} className="text-xs text-muted-foreground">Rolle i dette prosjektet</Label>
    <select id={id} className={nativeSelectClassName} value={choice} onChange={(event) => setChoice(event.target.value)}>
      <option value="inherit">{row.suggestedRolePrimary}</option>
      {roles.slice(1).map((role, index) => <option key={role} value={String(index + 1)}>{role}</option>)}
      <option value="custom">Annen rolle…</option>
    </select>
    {choice === "custom" ? <>
      <Label htmlFor={`${id}-custom`} className="sr-only">Egen rolle i prosjektet</Label>
      <Input id={`${id}-custom`} name="roleOverride" placeholder="Skriv rollen" required value={customRole} onChange={(event) => setCustomRole(event.target.value)} />
    </> : <input type="hidden" name="roleOverride" value={choice === "inherit" ? "" : roles[Number(choice)] ?? ""} />}
    <p className="text-xs text-muted-foreground">Gjelder kun dette prosjektet. Crewprofilen og eksisterende dagsplaner beholdes.</p>
  </div>;
}

export function ProjectCrewList({ rows, canEdit = false, canEditRates = false, canOpenProfile = false, onOptimisticRemove }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!rows.length) return null;
  if (!canEdit) return <div className="divide-y divide-border">{rows.map(row => <div key={row.id} className="flex justify-between gap-4 py-3"><div><p className="font-medium">{row.person.fullName}</p><p className="text-xs text-muted-foreground">{row.effectiveRole} · {row.person.phone || row.person.email || ""}</p></div></div>)}</div>;

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => {
        const pending = isPendingRow(row);
        const isOpen = !pending && expandedId === row.id;
        const metaParts: string[] = [];
        if (row.person.phone) metaParts.push(row.person.phone);
        if (row.notes?.trim()) metaParts.push("Notat");
        const meta =
          metaParts.length > 0 ? ` · ${metaParts.join(" · ")}` : "";

        return (
          <div key={row.id} aria-busy={pending || undefined} className={cn(pending && "opacity-60")}>
            <div className="flex min-h-[40px] items-stretch gap-1 py-2">
              <button
                type="button"
                disabled={pending}
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
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              <form
                action={async () => {
                  onOptimisticRemove?.(row.id);
                  await deactivateProjectCrew(row.id);
                }}
                className="flex shrink-0 items-center"
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  className="h-8 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                  title="Fjern fra prosjekt"
                >
                  Fjern
                </Button>
              </form>
            </div>

            {isOpen ? (
              <CrewRowForm row={row} canEditRates={canEditRates} canOpenProfile={canOpenProfile} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CrewRowForm({
  row,
  canEditRates,
  canOpenProfile,
}: {
  row: ProjectCrewRowClient;
  canEditRates: boolean;
  canOpenProfile: boolean;
}) {
  const [state, action, pending] = useActionState(submitProjectCrewRow.bind(null, row.id), null);
  return (
    <form
      action={action}
      className="mb-2 ml-2 border-l-2 border-border pl-4"
    >
      <div className="rounded-md bg-muted/25 px-4 py-3">
        <div className="mb-3 space-y-1.5 text-xs text-muted-foreground">
          <p>
            {canOpenProfile && <Link
              href={`/desk/crew/${row.person.id}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Åpne profil
              <ExternalLink className="h-3 w-3" />
            </Link>}
          </p>
          <p>
            Sats i listen kommer fra «Standard sats pr dag» på
            crew-profilen eller fra feltene under — ikke fra navnet.
          </p>
        </div>
        <div className="grid max-w-lg gap-4 sm:grid-cols-2">
          <ProjectRoleField key={`${row.id}-${row.roleOverride}`} row={row} />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Sats (override, NOK)
            </Label>
            <Input
              name="rateOverride"
              disabled={!canEditRates}
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
              disabled={!canEditRates}
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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SaveButton pending={pending} savedAt={state?.savedAt ?? null} failed={!!state?.error} size="sm" />
        </div>
      </div>
    </form>
  );
}
