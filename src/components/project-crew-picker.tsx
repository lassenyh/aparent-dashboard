"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getProjectCrewRoleOptions, createPersonForProject, addPersonToProject, searchPeopleForProject } from "@/actions/projects";
import type { PersonClient } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CrewRoleInput } from "@/components/crew/crew-role-input";
import { primaryRole } from "@/lib/person";

export function ProjectCrewPicker({
  projectId,
  onOptimisticAdd,
}: {
  projectId: string;
  /** Kalles inne i transition før server-handlingen, så personen vises umiddelbart. */
  onOptimisticAdd?: (person: PersonClient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [roles, setRoles] = useState("");
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonClient[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    getProjectCrewRoleOptions(projectId).then((options) => {
      if (!cancelled) setRoleOptions(options);
    }).catch(() => { if (!cancelled) toast.error("Kunne ikke hente rolleforslag"); });
    return () => { cancelled = true; };
  }, [createOpen, projectId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await searchPeopleForProject(projectId, q);
          if (!cancelled) setResults(r);
        } catch {
          if (!cancelled) toast.error("Kunne ikke søke i crewregisteret");
        }
      });
    }, 160);
    return () => { cancelled = true; clearTimeout(t); };
  }, [projectId, q, open]);

  async function pick(person: PersonClient) {
    // Lukk og vis personen med en gang; serverens svar erstatter den optimistiske raden.
    setOpen(false);
    setQ("");
    setResults((current) => current.filter((p) => p.id !== person.id));
    startTransition(async () => {
      onOptimisticAdd?.(person);
      try {
        await addPersonToProject(projectId, person.id);
        toast.success(`${person.fullName} lagt til`);
      } catch {
        toast.error(`Kunne ikke legge til ${person.fullName}`);
      }
    });
  }

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Legg til fra database
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,380px)] border-border p-0 shadow-md"
        align="start"
      >
        <div className="border-b border-border p-3">
          <Label className="sr-only" htmlFor="crew-search">
            Søk
          </Label>
          <Input
            id="crew-search"
            placeholder="Søk navn, rolle, telefon…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {pending && !results.length ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Søker…
            </p>
          ) : null}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              disabled={pending}
              className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <span className="font-medium text-foreground">{p.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {primaryRole(p)}
                {p.phone ? ` · ${p.phone}` : ""}
              </span>
            </button>
          ))}
          {!pending && !results.length ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Ingen treff. Du kan opprette en ny person under.
            </p>
          ) : null}
        </div>
        <div className="border-t border-border p-2">
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => { setOpen(false); setError(""); setRoles(""); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />Opprett ny person
          </Button>
        </div>
      </PopoverContent>
    </Popover>
    <Dialog open={createOpen} onOpenChange={(value) => { if (!creating) setCreateOpen(value); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opprett ny person</DialogTitle>
          <DialogDescription>Personen opprettes i crewregisteret og legges til prosjektet og crewlisten.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (creating) return;
          const data = new FormData(event.currentTarget);
          setCreating(true);
          setError("");
          try {
            const result = await createPersonForProject(projectId, data);
            if (result.error) { setError(result.error); return; }
            if (result.person) {
              toast.success(`${result.person.fullName} er opprettet og lagt til prosjektet`);
              setCreateOpen(false);
              setQ("");
              setResults([]);
            }
          } catch { setError("Kunne ikke opprette personen. Prøv igjen."); }
          finally { setCreating(false); }
        }}>
          {error ? <p role="alert" className="ap-error">{error}</p> : null}
          <fieldset disabled={creating} className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "firstName", label: "Fornavn", type: "text", required: true },
              { name: "lastName", label: "Etternavn", type: "text", required: true },
              { name: "email", label: "E-post", type: "email" },
              { name: "phone", label: "Telefon", type: "tel" },
              { name: "roles", label: "Roller (kommaseparert)", type: "text" },
              { name: "defaultRate", label: "Standard sats pr dag (NOK)", type: "number" },
            ].map((field) => <div key={field.name} className="space-y-2">
              <Label htmlFor={`new-project-crew-${field.name}`}>{field.label}</Label>
              {field.name === "roles" ? <CrewRoleInput id="new-project-crew-roles" value={roles} onChange={setRoles} roleOptions={roleOptions} /> : <Input id={`new-project-crew-${field.name}`} name={field.name} type={field.type} required={field.required} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? 1 : undefined} />}
            </div>)}
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>Avbryt</Button>
            <Button type="submit" disabled={creating}>{creating ? "Oppretter…" : "Opprett og legg til"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
