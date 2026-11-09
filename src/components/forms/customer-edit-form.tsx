"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateCustomer } from "@/actions/customers";
import type { Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { LogoField } from "@/components/forms/logo-field";
import { SaveButton } from "@/components/save-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState(
    updateCustomer.bind(null, customer.id),
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
        <Label htmlFor="name">Kundenavn</Label>
        <Input id="name" name="name" required defaultValue={customer.name} />
      </div>


      <LogoField key={state?.savedAt ?? 0} currentUrl={customer.logoUrl} />

      <div className="flex gap-3 pt-2">
        <SaveButton pending={pending} savedAt={state?.savedAt ?? null} failed={!!state?.error}>
          <Button type="button" variant="outline" asChild>
            <Link href="/desk/kunder">Tilbake</Link>
          </Button>
        </SaveButton>
      </div>
    </form>
  );
}
