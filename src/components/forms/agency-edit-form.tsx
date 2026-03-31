"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateAgency } from "@/actions/agencies";
import type { Agency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AgencyEditForm({ agency }: { agency: Agency }) {
  const [state, action, pending] = useActionState(
    updateAgency.bind(null, agency.id),
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
        <Label htmlFor="name">Navn på byrå</Label>
        <Input id="name" name="name" required defaultValue={agency.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgNumber">Org.nr</Label>
        <Input
          id="orgNumber"
          name="orgNumber"
          defaultValue={agency.orgNumber ?? ""}
        />
      </div>

      {agency.logoUrl ? (
        <div className="space-y-2 rounded-md border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Nåværende logo</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agency.logoUrl}
            alt=""
            className="h-12 max-w-[200px] object-contain object-left"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="logoFile">Bytt logo (fil)</Label>
        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo (URL)</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="text"
          inputMode="url"
          defaultValue={agency.logoUrl ?? ""}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/byra">Tilbake</Link>
        </Button>
      </div>
    </form>
  );
}
