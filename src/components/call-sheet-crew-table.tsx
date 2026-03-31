"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { CallSheetCrewClient } from "@/lib/serialize";
import {
  removeCallSheetCrewRow,
  reorderCallSheetCrew,
  updateCallSheetCrewRow,
} from "@/actions/callsheets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dietaryLabel } from "@/lib/dietary";
import { formatRate } from "@/lib/utils";

export function CallSheetCrewTable({
  callSheetId,
  rows,
}: {
  callSheetId: string;
  rows: CallSheetCrewClient[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ids = rows.map((r) => r.id);

  function save(
    rowId: string,
    patch: Parameters<typeof updateCallSheetCrewRow>[1],
  ) {
    startTransition(async () => {
      await updateCallSheetCrewRow(rowId, patch);
      router.refresh();
    });
  }

  function removeRow(rowId: string) {
    startTransition(async () => {
      await removeCallSheetCrewRow(rowId);
      toast.success("Fjernet");
      router.refresh();
    });
  }

  function move(rowId: string, dir: -1 | 1) {
    const idx = ids.indexOf(rowId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[idx], next[j]] = [next[j], next[idx]];
    startTransition(async () => {
      await reorderCallSheetCrew(callSheetId, next);
      router.refresh();
    });
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.id} className="py-6 first:pt-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{row.fullNameSnapshot}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.phoneSnapshot ?? "—"} · {row.emailSnapshot ?? "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Kost: {dietaryLabel(row.dietaryPreferenceSnapshot)}
                {row.allergiesSnapshot
                  ? ` · Allergier: ${row.allergiesSnapshot}`
                  : ""}
                {" · "}
                {formatRate(row.rateSnapshot, row.rateTypeSnapshot)}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => move(row.id, -1)}
                aria-label="Flytt opp"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => move(row.id, 1)}
                aria-label="Flytt ned"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                disabled={pending}
                onClick={() => removeRow(row.id)}
                aria-label="Fjern rad"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Rolle (snapshot)
              </label>
              <Input
                defaultValue={row.roleSnapshot}
                disabled={pending}
                onBlur={(e) => save(row.id, { roleSnapshot: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Call</label>
              <Input
                defaultValue={row.callTime ?? ""}
                placeholder="07:00"
                disabled={pending}
                onBlur={(e) => save(row.id, { callTime: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <label className="text-xs text-muted-foreground">
                Pickup / møte
              </label>
              <Input
                defaultValue={row.pickupInfo ?? ""}
                disabled={pending}
                onBlur={(e) => save(row.id, { pickupInfo: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-muted-foreground">Notat</label>
              <Textarea
                rows={2}
                defaultValue={row.notes ?? ""}
                disabled={pending}
                onBlur={(e) => save(row.id, { notes: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      {!rows.length ? (
        <p className="py-6 text-sm text-muted-foreground">
          Ingen crew ennå. Legg til fra prosjektcrew over.
        </p>
      ) : null}
    </div>
  );
}
