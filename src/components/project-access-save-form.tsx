"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { updateProjectMembership } from "@/actions/project-memberships";
import { Button } from "@/components/ui/button";

export function ProjectAccessSaveForm({ membershipId, children }: { membershipId: string; children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(formData: FormData) {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const result = await updateProjectMembership(membershipId, formData);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setMessage("Rettighetene er lagret.");
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

  return <form action={save} className="space-y-3" onChange={() => { setMessage(""); setError(""); }}>
    <fieldset disabled={pending} className="space-y-3">{children}</fieldset>
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Lagrer …" : "Lagre"}</Button>
      <p role="status" className="text-xs text-muted-foreground">{message}</p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </form>;
}
