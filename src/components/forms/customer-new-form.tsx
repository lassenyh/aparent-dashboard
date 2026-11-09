"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { BrregSearch } from "@/components/brreg-search";
import { createCustomer, createCustomerInline } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { LogoField } from "@/components/forms/logo-field";
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

      <LogoField />

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
