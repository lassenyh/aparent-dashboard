"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAgency } from "@/actions/agencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AgencyNewForm() {
  const [state, action, pending] = useActionState(createAgency, null);

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Navn på byrå</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgNumber">Org.nr</Label>
        <Input id="orgNumber" name="orgNumber" placeholder="f.eks. 123 456 789" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoFile">Logo fra datamaskin</Label>
        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        />
        <p className="text-xs text-muted-foreground">
          PNG, JPG, SVG, WebP eller GIF (maks 2 MB).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Alternativt: logo (URL)</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="text"
          inputMode="url"
          placeholder="https://…"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett byrå"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/byra">Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}
