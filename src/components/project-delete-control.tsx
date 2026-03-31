"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Sletter…" : "Slett permanent"}
    </Button>
  );
}

export function ProjectDeleteControl({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Slett prosjekt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slette prosjekt?</DialogTitle>
          <DialogDescription>
            Dette sletter «{label}» og all tilknyttet data (crew, call sheets,
            dagsplaner). Denne handlingen kan ikke angres.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <form action={deleteProject.bind(null, projectId)}>
            <DeleteSubmitButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
