"use client";

import { useActionState } from "react";
import { createDashboardUser } from "@/actions/dashboard-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardUserAddForm() {
  const [state, action, pending] = useActionState(createDashboardUser, null);

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Opprett ny dashboard-bruker og velg om vedkommende skal ha admin-tilgang.
      </p>
      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="du-username">Brukernavn</Label>
          <Input id="du-username" name="username" required autoComplete="username" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="du-password">Passord</Label>
          <Input
            id="du-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="du-fullname">Fullt navn</Label>
          <Input id="du-fullname" name="fullName" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="du-email">E-post</Label>
          <Input id="du-email" name="email" type="email" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isInternal" defaultChecked />
          Admin-tilgang (hele dashboardet)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked />
          Aktiv bruker
        </label>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Oppretter …" : "Opprett bruker"}
      </Button>
    </form>
  );
}
