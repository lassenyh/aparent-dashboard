"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { BrregSearch } from "@/components/brreg-search";
import { createCustomer, createCustomerInline } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerNewForm({ onCreated, onCancel, onPendingChange }: {
  onCreated?: (customer: { id: string; name: string }) => void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
} = {}) {
  const id = useId();
  const [state, action, pending] = useActionState<{ error?: string; customer?: { id: string; name: string } } | null, FormData>(onCreated ? createCustomerInline : createCustomer, null);
  useEffect(() => {
    if (state?.customer) onCreated?.(state.customer);
  }, [state, onCreated]);
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);

  const [name, setName] = useState("");

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <BrregSearch disabled={pending} onSelect={(organization) => {
        setName(organization.name);
      }} />

      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Kundenavn</Label>
        <Input id={`${id}-name`} name="name" required value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-logoFile`}>Logo fra datamaskin</Label>
        <Input
          id={`${id}-logoFile`}
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        />
        <p className="text-xs text-muted-foreground">
          PNG, JPG, SVG, WebP eller GIF (maks 2 MB). Lagres på serveren.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-logoUrl`}>Alternativt: logo (URL)</Label>
        <Input
          id={`${id}-logoUrl`}
          name="logoUrl"
          type="text"
          inputMode="url"
          placeholder="https://…"
        />
        <p className="text-xs text-muted-foreground">
          Hvis du velger fil over, ignoreres URL. URL er nyttig på hosting uten
          skrivbar disk (f.eks. noen skyplattformer).
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="sidebar" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett kunde"}
        </Button>
        {onCancel ? <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Avbryt</Button> : (
          <Button type="button" variant="outline" asChild><Link href="/kunder">Avbryt</Link></Button>
        )}
      </div>
    </form>
  );
}
