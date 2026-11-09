"use client";

import { useActionState } from "react";
import { updateDashboardUserAccess } from "@/actions/dashboard-users";
import { SaveButton } from "@/components/save-button";

/** Admin-tilgang / aktiv-status for én dashboardbruker (Brukertilgang). */
export function UserAccessForm({
  userId,
  isInternal,
  isActive,
  isSelf,
}: {
  userId: string;
  isInternal: boolean;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(updateDashboardUserAccess.bind(null, userId), null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isInternal" defaultChecked={isInternal} disabled={isSelf} />
          Admin-tilgang (hele dashboardet)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={isActive} disabled={isSelf} />
          Aktiv bruker
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton pending={pending} savedAt={state?.savedAt ?? null} failed={!!state?.error} size="sm" />
        {state?.error ? <p role="alert" className="text-xs text-destructive">{state.error}</p> : null}
      </div>
    </form>
  );
}
