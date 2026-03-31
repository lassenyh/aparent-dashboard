"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { addProjectCrewToCallSheet } from "@/actions/callsheets";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Opt = { projectCrewId: string; label: string };

export function CallSheetAddCrew({
  callSheetId,
  options,
}: {
  callSheetId: string;
  options: Opt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(projectCrewId: string) {
    if (!projectCrewId) return;
    startTransition(async () => {
      const res = await addProjectCrewToCallSheet(callSheetId, projectCrewId);
      if (res && "error" in res) {
        toast.error(res.error ?? "Kunne ikke legge til");
        return;
      }
      toast.success("Lagt til på call sheet");
      router.refresh();
    });
  }

  if (!options.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Alle prosjektcrew er allerede på denne call sheet, eller prosjektet har
        ingen aktive crew.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        key={options.map((o) => o.projectCrewId).join(",")}
        disabled={pending}
        onValueChange={(v) => add(v)}
      >
        <SelectTrigger className="w-[min(100%,280px)] bg-background">
          <SelectValue placeholder="Legg til fra prosjektcrew…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.projectCrewId} value={o.projectCrewId}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <Button type="button" variant="ghost" size="sm" disabled>
          Legger til…
        </Button>
      ) : null}
    </div>
  );
}
