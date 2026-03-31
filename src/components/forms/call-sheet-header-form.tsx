"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateCallSheet } from "@/actions/callsheets";
import type { CallSheetFormClient } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/lib/form-classes";

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function CallSheetHeaderForm({
  sheet,
  projectId,
}: {
  sheet: CallSheetFormClient;
  projectId: string;
}) {
  const [state, action, pending] = useActionState(
    updateCallSheet.bind(null, sheet.id),
    null,
  );

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="name">Navn</Label>
          <Input id="name" name="name" required defaultValue={sheet.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Dato</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={toDateInput(sheet.date)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="generalCallTime">Generell call</Label>
          <Input
            id="generalCallTime"
            name="generalCallTime"
            defaultValue={sheet.generalCallTime ?? ""}
            placeholder="07:00"
          />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="location">Lokasjon</Label>
          <Input
            id="location"
            name="location"
            defaultValue={sheet.location ?? ""}
          />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="notes">Notater</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={sheet.notes ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className={nativeSelectClassName}
            defaultValue={sheet.status}
          >
            <option value="draft">Kladd</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}`}>Til prosjekt</Link>
        </Button>
      </div>
    </form>
  );
}
