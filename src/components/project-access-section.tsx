import {
  listProjectMemberships,
  removeProjectMembership,
  updateProjectMembership,
} from "@/actions/project-memberships";
import type { ProjectAccessFlags } from "@/lib/project-access";
import { ProjectAccessAddUserForm } from "@/components/project-access-add-user-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProjectPageSection } from "@/components/project-page-section";
import { nativeSelectClassName } from "@/lib/form-classes";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  flags: ProjectAccessFlags;
};

const permFields: {
  name: keyof Pick<
    ProjectAccessFlags,
    | "canViewProjectInfo"
    | "canViewCrew"
    | "canEditCrew"
    | "canViewDagsplan"
    | "canEditDagsplan"
    | "canViewSensitiveData"
    | "canViewPayroll"
    | "canEditPayroll"
    | "canImportCrewDatabase"
  >;
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

export async function ProjectAccessSection({ projectId, flags }: Props) {
  if (!flags.canManageMemberships) return null;

  const rows = await listProjectMemberships(projectId);

  return (
    <ProjectPageSection title="Prosjekttilgang">
      <div className="space-y-8 pt-2">
        <ProjectAccessAddUserForm projectId={projectId} />

        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((m) => (
            <div key={m.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{m.user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.user.fullName ?? "—"}
                    {m.user.isInternal ? " · intern" : ""}
                  </p>
                </div>
                <form action={removeProjectMembership.bind(null, m.id)}>
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    Fjern
                  </Button>
                </form>
              </div>
              <form action={updateProjectMembership.bind(null, m.id)} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-xs">Rolle</Label>
                  <select
                    name="role"
                    className={cn(nativeSelectClassName, "h-9 w-[180px]")}
                    defaultValue={m.role}
                  >
                    <option value="owner">Eier</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Redaktør</option>
                    <option value="viewer">Leser</option>
                  </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permFields.map(({ name, label }) => (
                    <label key={name} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        name={name}
                        defaultChecked={Boolean(m[name])}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <Button type="submit" size="sm">
                  Lagre
                </Button>
              </form>
            </div>
          ))}
          {!rows.length ? (
            <p className="p-4 text-sm text-muted-foreground">
              Ingen eksterne brukere ennå — kun interne ser alle prosjekter.
            </p>
          ) : null}
        </div>
      </div>
    </ProjectPageSection>
  );
}

