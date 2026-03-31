"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateProject } from "@/actions/projects";
import type { ProjectFormClient } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/lib/form-classes";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

type Opt = { id: string; name: string };

export function ProjectEditForm({
  project,
  agencies,
  customers,
}: {
  project: ProjectFormClient;
  agencies: Opt[];
  customers: Opt[];
}) {
  const [state, action, pending] = useActionState(
    updateProject.bind(null, project.id),
    null,
  );

  return (
    <form action={action} className="space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Prosjektnavn</Label>
        <Input id="name" name="name" required defaultValue={project.name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Kunde</Label>
          <select
            id="customerId"
            name="customerId"
            className={nativeSelectClassName}
            defaultValue={project.customerId ?? ""}
          >
            <option value="">Ingen</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agencyId">Byrå</Label>
          <select
            id="agencyId"
            name="agencyId"
            className={nativeSelectClassName}
            defaultValue={project.agencyId ?? ""}
          >
            <option value="">Ingen</option>
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
        <Input
          id="internalTitle"
          name="internalTitle"
          defaultValue={project.internalTitle ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInput(project.startDate)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Slutt</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInput(project.endDate)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className={nativeSelectClassName}
          defaultValue={project.status}
        >
          <option value="active">Aktiv</option>
          <option value="archived">Arkivert</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notater</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={project.notes ?? ""}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre prosjekt"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Tilbake</Link>
        </Button>
      </div>
    </form>
  );
}
