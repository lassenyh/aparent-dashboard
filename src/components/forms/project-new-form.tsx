"use client";

import { useActionState, useCallback, useState } from "react";
import Link from "next/link";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectClassName } from "@/lib/form-classes";

import { CustomerNewForm } from "@/components/forms/customer-new-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { ProjectLeadFields } from "@/components/forms/project-lead-fields";
import { isProducerRole, type LeadPerson } from "@/lib/project-leads";

type Opt = { id: string; name: string };

export function ProjectNewForm({
  agencies,
  customers,
  people,
}: {
  agencies: Opt[];
  customers: Opt[];
  people: LeadPerson[];
}) {
  const [state, action, pending] = useActionState(createProject, null);

  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerPending, setCustomerPending] = useState(false);
  const [addedCustomers, setAddedCustomers] = useState<Opt[]>([]);
  const [customerId, setCustomerId] = useState("");
  const customerOptions = Array.from(new Map([...customers, ...addedCustomers].map((customer) => [customer.id, customer])).values())
    .sort((a, b) => a.name.localeCompare(b.name, "nb"));
  const onCustomerCreated = useCallback((customer: Opt) => {
    setAddedCustomers((existing) => [...existing, customer]);
    setCustomerId(customer.id);
    setCustomerOpen(false);
    setCustomerPending(false);
  }, []);

  return (
    <>
    <form action={action} className="max-w-lg space-y-6">
      {state?.error ? (
        <p className="ap-callout ap-error">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          <Label htmlFor="internalTitle">Prosjektnummer</Label>
          <Input id="internalTitle" name="internalTitle" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Prosjektnavn</Label>
          <Input id="name" name="name" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Kunde</Label>
          <select
            id="customerId"
            name="customerId"
            className={nativeSelectClassName}
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Velg kunde…</option>
            {customerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setCustomerOpen(true)}>
            Ny kunde
          </Button>
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

      <ProjectLeadFields people={people} producerId={people.find((person) => person.fullName.trim().toLocaleLowerCase("nb") === "lasse nyhaugen" && person.roles.some(isProducerRole))?.id} />

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

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="sidebar" disabled={pending}>
          {pending ? "Oppretter…" : "Opprett prosjekt"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/desk">Avbryt</Link>
        </Button>
      </div>
    </form>
    <Dialog open={customerOpen} onOpenChange={(open) => { if (!customerPending) setCustomerOpen(open); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny kunde</DialogTitle>
          <DialogDescription>Kunden velges automatisk i prosjektet når du lagrer.</DialogDescription>
        </DialogHeader>
        <CustomerNewForm onCreated={onCustomerCreated} onCancel={() => setCustomerOpen(false)} onPendingChange={setCustomerPending} />
      </DialogContent>
    </Dialog>
    </>
  );
}
