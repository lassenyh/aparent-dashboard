"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  addProjectCrewToDefaultList,
  moveProjectCrewListMember,
  removeProjectCrewListMember,
} from "@/actions/project-crew-list";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DefaultCrewRowProps = {
  memberId: string;
  fullName: string;
  roleLine: string;
  rateLine: string;
};

export type DefaultCrewAvailableProps = {
  projectCrewId: string;
  label: string;
};

export function ProjectDefaultCrewListEditor({
  projectId,
  rows,
  availableToAdd,
}: {
  projectId: string;
  rows: DefaultCrewRowProps[];
  availableToAdd: DefaultCrewAvailableProps[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch {
        toast.error("Noe gikk galt");
      }
    });
  }

  return (
    <div className="space-y-4">
      {availableToAdd.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <Select
            key={`${availableToAdd.length}-${rows.length}`}
            disabled={pending}
            onValueChange={(projectCrewId) => {
              if (!projectCrewId) return;
              run(async () => {
                await addProjectCrewToDefaultList(projectId, projectCrewId);
                toast.success("Lagt til i crewliste");
              });
            }}
          >
            <SelectTrigger className="w-[min(100%,320px)] bg-background">
              <SelectValue placeholder="Legg til fra prosjektcrew…" />
            </SelectTrigger>
            <SelectContent>
              {availableToAdd.map((o) => (
                <SelectItem key={o.projectCrewId} value={o.projectCrewId}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : rows.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Alle aktive prosjektcrew er allerede i standardlisten.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((row, index) => (
            <div
              key={row.memberId}
              className="flex min-h-[40px] items-center gap-2 py-2 pl-3 pr-2"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-semibold leading-tight text-foreground">
                  {row.fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.roleLine}
                </p>
              </div>
              <span className="shrink-0 tabular-nums text-sm text-foreground">
                {row.rateLine}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  disabled={pending || index === 0}
                  aria-label="Flytt opp"
                  onClick={() =>
                    run(async () => {
                      await moveProjectCrewListMember(
                        projectId,
                        row.memberId,
                        "up",
                      );
                    })
                  }
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  disabled={pending || index === rows.length - 1}
                  aria-label="Flytt ned"
                  onClick={() =>
                    run(async () => {
                      await moveProjectCrewListMember(
                        projectId,
                        row.memberId,
                        "down",
                      );
                    })
                  }
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await removeProjectCrewListMember(row.memberId);
                      toast.success("Fjernet fra crewliste");
                    })
                  }
                >
                  Fjern
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Listen er tom. Legg til personer fra prosjektcrew over — de legges
          automatisk inn på nye call sheets i denne rekkefølgen.
        </p>
      )}
    </div>
  );
}
