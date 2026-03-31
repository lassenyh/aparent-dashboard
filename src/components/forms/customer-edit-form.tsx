"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateCustomer } from "@/actions/customers";
import type { Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
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

      {customer.logoUrl ? (
        <div className="space-y-2 rounded-md border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Nåværende logo</p>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={customer.logoUrl}
              alt=""
              className="h-12 max-w-[200px] object-contain object-left"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="logoFile">Bytt logo (fil fra datamaskin)</Label>
        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
        />
        <p className="text-xs text-muted-foreground">
          PNG, JPG, SVG, WebP eller GIF (maks 2 MB). Erstatter eksisterende logo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo (URL)</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="text"
          inputMode="url"
          defaultValue={customer.logoUrl ?? ""}
          placeholder="Tomt = fjern logo (hvis du ikke laster opp ny fil)"
        />
        <p className="text-xs text-muted-foreground">
          Tøm feltet for å fjerne logo når du ikke laster opp ny fil. Du kan også
          lime inn ekstern URL i stedet for fil.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/kunder">Tilbake</Link>
        </Button>
      </div>
    </form>
  );
}
