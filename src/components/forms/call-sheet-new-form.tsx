"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCallSheet } from "@/actions/callsheets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/lib/form-classes";

export function CallSheetNewForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    createCallSheet.bind(null, projectId),
    null,
  );

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Navn</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="f.eks. Dag 4 — Location"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Dato</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="generalCallTime">Generell call</Label>
          <Input
            id="generalCallTime"
            name="generalCallTime"
            placeholder="07:00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Lokasjon</Label>
        <Input id="location" name="location" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notater</Label>
        <Textarea id="notes" name="notes" rows={4} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className={nativeSelectClassName}
          defaultValue="draft"
        >
          <option value="draft">Kladd</option>
          <option value="final">Final</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett call sheet"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}`}>Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}
