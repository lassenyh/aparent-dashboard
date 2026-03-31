"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addPersonToProject, searchPeopleForProject } from "@/actions/projects";
import type { PersonClient } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { primaryRole } from "@/lib/person";

export function ProjectCrewPicker({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonClient[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchPeopleForProject(projectId, q);
        setResults(r);
      });
    }, 160);
    return () => clearTimeout(t);
  }, [projectId, q]);

  async function pick(person: PersonClient) {
    startTransition(async () => {
      try {
        await addPersonToProject(projectId, person.id);
        toast.success(`${person.fullName} lagt til`);
        setOpen(false);
        setQ("");
        router.refresh();
      } catch {
        toast.error("Kunne ikke legge til");
      }
    });
  }

  return (
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
              Ingen treff. Opprett personen i crew-databasen først.
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
