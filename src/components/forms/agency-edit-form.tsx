"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateAgency } from "@/actions/agencies";
import type { Agency } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { LogoField } from "@/components/forms/logo-field";
import { SaveButton } from "@/components/save-button";
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


      <LogoField key={state?.savedAt ?? 0} currentUrl={agency.logoUrl} />

      <div className="flex gap-3 pt-2">
        <SaveButton pending={pending} savedAt={state?.savedAt ?? null} failed={!!state?.error}>
          <Button type="button" variant="outline" asChild>
            <Link href="/byra">Tilbake</Link>
          </Button>
        </SaveButton>
      </div>
    </form>
  );
}
