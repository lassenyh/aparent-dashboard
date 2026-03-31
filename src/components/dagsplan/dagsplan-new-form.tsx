"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createDagsplan } from "@/actions/dagsplan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DagsplanNewForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    createDagsplan.bind(null, projectId),
    null,
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="title">Tittel</Label>
        <Input
          id="title"
          name="title"
          placeholder="f.eks. Dag 3 — Studio"
          defaultValue="Ny dagsplan"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shootDate">Innspillingsdato</Label>
        <Input
          id="shootDate"
          name="shootDate"
          type="date"
          required
          defaultValue={today}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett og rediger"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}`}>Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}
