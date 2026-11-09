"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { BrregSearch } from "@/components/brreg-search";
import { createAgency } from "@/actions/agencies";
import { Button } from "@/components/ui/button";
import { LogoField } from "@/components/forms/logo-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AgencyNewForm() {
  const [state, action, pending] = useActionState(createAgency, null);

  const [name, setName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");

  return (
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <BrregSearch disabled={pending} onSelect={(organization) => {
        setName(organization.name);
        setOrgNumber(organization.organizationNumber);
      }} />

      <div className="space-y-2">
        <Label htmlFor="name">Navn på byrå</Label>
        <Input id="name" name="name" required value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgNumber">Org.nr</Label>
        <Input id="orgNumber" name="orgNumber" placeholder="f.eks. 123 456 789" value={orgNumber} onChange={(event) => setOrgNumber(event.target.value)} />
      </div>

      <LogoField />

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="sidebar" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett byrå"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/byra">Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}
