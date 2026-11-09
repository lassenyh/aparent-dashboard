import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { listDashboardUsers, removeDashboardUser } from "@/actions/dashboard-users";
import { UserAccessForm } from "@/components/user-access-form";
import { revokeProjectInvitation } from "@/actions/project-invitations";
import { DashboardUserAddForm } from "@/components/dashboard-user-add-form";
import { PageHeader } from "@/components/page-header";
import { ProjectInvitationForm } from "@/components/project-invitation-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { invitationConfiguration } from "@/lib/invitations/config";
import { requireInternalUser } from "@/lib/project-access";
import { compareProjectNumbers } from "@/lib/project-list-presentation";
import { formatProjectDisplayName } from "@/lib/utils";

export default async function UserAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; view?: string }>;
}) {
  const me = await requireInternalUser();
  const [rows, projects, invitations, search] = await Promise.all([
    listDashboardUsers(),
    prisma.project.findMany({
      select: { id: true, name: true, internalTitle: true },
    }),
    prisma.projectInvitation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        project: { select: { name: true, internalTitle: true } },
      },
    }),
    searchParams,
  ]);
  projects.sort((a, b) => compareProjectNumbers(a, b, "desc"));
  const config = invitationConfiguration();
  const activeView = search.view === "global" ? "global" : "project";

  return (
    <>
      <PageHeader
        title="Brukertilgang"
        description="Inviter samarbeidspartnere til ett prosjekt, og administrer eksisterende brukere."
      />

      <nav aria-label="Brukertilgang" className="ap-tabs mb-8 overflow-x-auto overflow-y-hidden">
        <Link
          href="/brukertilgang"
          scroll={false}
          aria-current={activeView === "project" ? "page" : undefined}
          className="inline-flex shrink-0 items-center whitespace-nowrap"
        >
          Prosjekttilgang
        </Link>
        <Link
          href="/brukertilgang?view=global"
          scroll={false}
          aria-current={activeView === "global" ? "page" : undefined}
          className="inline-flex shrink-0 items-center whitespace-nowrap"
        >
          Global tilgang
        </Link>
      </nav>

      {activeView === "project" ? (
        <div className="space-y-12">
          <ProjectInvitationForm
            projects={projects.map((project) => ({
              id: project.id,
              name: formatProjectDisplayName(project),
            }))}
            inviter={me.fullName || me.username}
            ready={config.ready}
            initialProjectId={search.projectId}
          />

          <section className="space-y-4">
          <div>
            <p className="ap-kicker text-muted-foreground">03 / Invitasjoner</p>
            <h2 className="mt-2 text-xl font-medium">Sendte invitasjoner</h2>
          </div>
          <div className="divide-y divide-border border border-border bg-card">
            {invitations.length ? invitations.map((invite) => {
              const expired = invite.status === "sent" && invite.expiresAt <= new Date();
              const label = expired ? "Utløpt" : ({
                sending: "Sender / avventer bekreftelse",
                sent: "Sendt · venter på svar",
                accepted: "Godtatt",
                revoked: "Tilbakekalt",
                failed: "Sending mislyktes",
              }[invite.status] ?? invite.status);

              return <div key={invite.id} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-medium">{invite.email}</p><p className="mt-1 text-sm text-muted-foreground">{formatProjectDisplayName(invite.project)} · {label}</p><p className="mt-1 text-xs text-muted-foreground">{invite.status === "accepted" ? "Tilgang administreres i prosjektets Tilgang-fane." : `Gyldig til ${invite.expiresAt.toLocaleDateString("nb-NO")}. Send skjemaet på nytt for å erstatte invitasjonen.`}</p></div><div className="flex flex-wrap gap-2">{invite.status === "accepted" ? <Button asChild variant="outline" size="sm"><Link href={`/projects/${invite.projectId}?tab=access`}>Endre rettigheter</Link></Button> : null}{invite.status !== "revoked" ? <form action={revokeProjectInvitation.bind(null, invite.id)}><Button variant="outline" size="sm" type="submit">{invite.status === "accepted" ? "Fjern prosjekttilgang" : "Trekk tilbake"}</Button></form> : null}</div></div>;
            }) : <p className="p-5 text-sm text-muted-foreground">Ingen invitasjoner ennå.</p>}
          </div>
          </section>
        </div>
      ) : (
        <section className="space-y-5">
          <div>
            <p className="ap-kicker text-muted-foreground">Global tilgang</p>
            <h2 className="mt-2 text-xl font-medium">Brukere og global tilgang</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Admin-brukere ser alle prosjekter og moduler. Bruk skjemaet under bare når noen skal ha tilgang til hele dashboardet.</p>
          </div>
            <DashboardUserAddForm />

            <div className="ap-table-wrap divide-y divide-border-hairline">
          {rows.map((u) => {
            const isSelf = me.id === u.id;
            return (
              <details key={u.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.fullName || u.username}</span>
                    <span className="block truncate text-xs text-muted-foreground">{u.email || u.username}{u.company ? ` · ${u.company}` : ""}</span>
                  </div>
                  {isSelf && <span className="hidden text-xs text-muted-foreground sm:inline">Din bruker</span>}
                  <span className="text-xs text-muted-foreground">{u.isInternal ? "Admin" : `${u.memberships.length} prosjekt${u.memberships.length === 1 ? "" : "er"}`}</span>
                  {!u.isActive && <span className="text-xs text-destructive">Inaktiv</span>}
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border-hairline bg-muted/20 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Brukernavn: {u.username}{isSelf ? " · Din bruker" : ""}</p>
                    {!isSelf && <form action={removeDashboardUser.bind(null, u.id)}>
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">Fjern</Button>
                    </form>}
                  </div>
                <UserAccessForm userId={u.id} isInternal={u.isInternal} isActive={u.isActive} isSelf={isSelf} />
                {!u.isInternal ? (
                  <div className="mt-4 bg-muted/40 p-3">
                    <p className="ap-kicker mb-2">Prosjekter</p>
                    {u.memberships.length ? (
                      <ul className="space-y-1">
                        {u.memberships.map((membership) => (
                          <li key={membership.project.id} className="text-sm">
                            <Link
                              href={`/projects/${membership.project.id}`}
                              className="text-foreground hover:underline"
                            >
                              {formatProjectDisplayName(membership.project)}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {` · ${membership.role}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ingen prosjekttilknytning.</p>
                    )}
                  </div>
                ) : null}
                </div>
              </details>
            );
          })}
          {!rows.length ? (
            <p className="p-4 text-sm text-muted-foreground">Ingen dashboard-brukere ennå.</p>
          ) : null}
            </div>
        </section>
      )}
    </>
  );
}
