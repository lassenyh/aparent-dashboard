import { listDashboardUsers, removeDashboardUser, updateDashboardUserAccess } from "@/actions/dashboard-users";
import { DashboardUserAddForm } from "@/components/dashboard-user-add-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireInternalUser } from "@/lib/project-access";

export default async function UserAccessPage() {
  const me = await requireInternalUser();
  const rows = await listDashboardUsers();

  return (
    <>
      <PageHeader
        title="Brukertilgang"
        description="Administrer tilgang for hele dashboardet. Admin-brukere ser alle prosjekter og moduler."
      />

      <div className="space-y-8">
        <DashboardUserAddForm />

        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((u) => {
            const isSelf = me.id === u.id;
            return (
              <div key={u.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{u.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.fullName ?? "—"}
                      {u.email ? ` · ${u.email}` : ""}
                      {u.company ? ` · ${u.company}` : ""}
                    </p>
                  </div>
                  {!isSelf ? (
                    <form action={removeDashboardUser.bind(null, u.id)}>
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Fjern
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted-foreground">Din bruker</span>
                  )}
                </div>
                <form action={updateDashboardUserAccess.bind(null, u.id)} className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isInternal"
                        defaultChecked={u.isInternal}
                        disabled={isSelf}
                      />
                      Admin-tilgang (hele dashboardet)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={u.isActive}
                        disabled={isSelf}
                      />
                      Aktiv bruker
                    </label>
                  </div>
                  <Button type="submit" size="sm" disabled={isSelf}>
                    Lagre
                  </Button>
                </form>
              </div>
            );
          })}
          {!rows.length ? (
            <p className="p-4 text-sm text-muted-foreground">Ingen dashboard-brukere ennå.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
