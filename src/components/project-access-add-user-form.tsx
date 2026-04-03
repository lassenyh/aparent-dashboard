"use client";

import { useActionState } from "react";
import { addUserToProject } from "@/actions/project-memberships";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectClassName } from "@/lib/form-classes";
import { cn } from "@/lib/utils";

const permFields: {
  name:
    | "canViewProjectInfo"
    | "canViewCrew"
    | "canEditCrew"
    | "canViewDagsplan"
    | "canEditDagsplan"
    | "canViewSensitiveData"
    | "canViewPayroll"
    | "canEditPayroll"
    | "canImportCrewDatabase";
  label: string;
}[] = [
  { name: "canViewProjectInfo", label: "Se prosjektinfo" },
  { name: "canViewCrew", label: "Se crew" },
  { name: "canEditCrew", label: "Redigere crew" },
  { name: "canViewDagsplan", label: "Se dagsplan" },
  { name: "canEditDagsplan", label: "Redigere dagsplan" },
  { name: "canViewSensitiveData", label: "Sensitive personopplysninger" },
  { name: "canViewPayroll", label: "Se lønningslister" },
  { name: "canEditPayroll", label: "Redigere lønningslister" },
  {
    name: "canImportCrewDatabase",
    label: "Importere crew til databasen (PDF/tekst) og til dette prosjektet",
  },
];

function inviteDefault(name: string): boolean {
  if (name === "canViewProjectInfo") return true;
  if (name === "canViewDagsplan" || name === "canEditDagsplan") return true;
  return false;
}

export function ProjectAccessAddUserForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    addUserToProject.bind(null, projectId),
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Legg til eksisterende brukernavn, eller opprett ny med passord (minst 8 tegn).
      </p>

      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pa-username">Brukernavn</Label>
          <Input id="pa-username" name="username" required autoComplete="username" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pa-password">Passord (kun ny bruker)</Label>
          <Input
            id="pa-password"
            name="password"
            type="password"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pa-fullname">Fullt navn</Label>
          <Input id="pa-fullname" name="fullName" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pa-email">E-post</Label>
          <Input id="pa-email" name="email" type="email" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pa-role">Rolle</Label>
        <select
          id="pa-role"
          name="role"
          className={cn(nativeSelectClassName, "h-9 max-w-xs")}
          defaultValue="editor"
        >
          <option value="owner">Eier</option>
          <option value="admin">Admin</option>
          <option value="editor">Redaktør</option>
          <option value="viewer">Leser</option>
        </select>
      </div>
      <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
        {permFields.map(({ name, label }) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} defaultChecked={inviteDefault(name)} />
            {label}
          </label>
        ))}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Legger til …" : "Legg til bruker"}
      </Button>
    </form>
  );
}
