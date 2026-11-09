"use client";

import { useActionState, type ReactNode } from "react";
import { updatePayrollFees } from "@/actions/payroll";
import { SaveButton } from "@/components/save-button";

/** Honorarskjema for brukere med begrenset lønningsliste-tilgang. Tabellen rendres på serveren. */
export function PayrollFeesForm({
  projectId,
  listId,
  canSave,
  children,
}: {
  projectId: string;
  listId: string;
  canSave: boolean;
  children: ReactNode;
}) {
  const [state, action, pending] = useActionState(updatePayrollFees.bind(null, projectId, listId), null);
  return (
    <form action={action} className="space-y-4">
      {children}
      {canSave ? (
        <div className="flex flex-wrap items-center gap-3">
          <SaveButton pending={pending} savedAt={state?.savedAt ?? null} failed={!!state?.error} label="Lagre honorarer" />
          {state?.error ? <p role="alert" className="text-xs text-destructive">{state.error}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
