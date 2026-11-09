"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { updateProjectMembership } from "@/actions/project-memberships";
import { SaveButton } from "@/components/save-button";

export function ProjectAccessSaveForm({ membershipId, children }: { membershipId: string; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save(formData: FormData) {
    setPending(true);
    setError("");
    try {
      const result = await updateProjectMembership(membershipId, formData);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setSavedAt(Date.now());
        toast.success("Rettighetene er lagret.");
      }
    } catch {
      const message = "Kunne ikke lagre rettighetene. Prøv igjen.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return <form action={save} className="space-y-3" onChange={() => setError("")}>
    <fieldset disabled={pending} className="space-y-3">{children}</fieldset>
    <div className="flex items-center gap-3">
      <SaveButton pending={pending} savedAt={savedAt} failed={!!error} size="sm" />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </form>;
}
