"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/lib/form-classes";

type Opt = { id: string; name: string };

export function ProjectNewForm({
  agencies,
  customers,
}: {
  agencies: Opt[];
  customers: Opt[];
}) {
  const [state, action, pending] = useActionState(createProject, null);

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Prosjektnavn</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Kunde</Label>
          <select
            id="customerId"
            name="customerId"
            className={nativeSelectClassName}
            defaultValue=""
          >
            <option value="">Velg kunde…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Opprett kunder under «Kunder».
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agencyId">Byrå</Label>
          <select
            id="agencyId"
            name="agencyId"
            className={nativeSelectClassName}
            defaultValue=""
          >
            <option value="">Velg byrå…</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="internalTitle">Internt navn / kode</Label>
        <Input id="internalTitle" name="internalTitle" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Slutt</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className={nativeSelectClassName}
          defaultValue="active"
        >
          <option value="active">Aktiv</option>
          <option value="archived">Arkivert</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notater</Label>
        <Textarea id="notes" name="notes" rows={4} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett prosjekt"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}
