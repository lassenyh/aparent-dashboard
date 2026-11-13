import Link from "next/link";
import { Mail, Plus, Receipt, Send } from "lucide-react";
import { CrewListDialog } from "@/components/crew/crew-list-dialog";
import { CrewListDialogContent } from "@/components/crew/crew-list-dialog-content";
import { notFound } from "next/navigation";
import { getAgencyOptions } from "@/actions/agencies";
import { getCustomerOptions } from "@/actions/customers";
import { getProjectById, getProjectLeadOptions } from "@/actions/projects";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { ProjectInfoSection } from "@/components/project-info-section";
import { ProjectPageSection } from "@/components/project-page-section";
import { ProjectCrewSection } from "@/components/project-crew-section";
import { sortProjectCrewByDepartmentOrder } from "@/lib/crew-department-order";
import { ProjectDeleteControl } from "@/components/project-delete-control";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectLeads } from "@/lib/project-leads";
import { projectListLabel } from "@/lib/project-list-presentation";
import { formatDateShort, formatProjectDisplayName } from "@/lib/utils";
import {
  projectScalarsForClient,
  serializeProjectCrewRowForClient,
} from "@/lib/serialize";
import { deleteCallSheet } from "@/actions/callsheets";
import { deleteDagsplan, duplicateDagsplan } from "@/actions/dagsplan";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { ConfirmDeleteListItem } from "@/components/confirm-delete-list-item";
import { ProjectAccessSection } from "@/components/project-access-section";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { getProjectAccessForUser } from "@/lib/project-access";
import {
  createPayrollListFormAction,
  deletePayrollList,
} from "@/actions/payroll";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[] }> };

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, { tab: requestedTab }, user] = await Promise.all([
    params,
    searchParams,
    getSessionDashboardUser(),
  ]);
  if (!user) notFound();
  const flags = await getProjectAccessForUser(user, id);
  if (!flags) notFound();

  const tabs = [
    { id: "overview", label: "Oversikt", visible: flags.canViewProjectInfo },
    { id: "crew", label: "Crew", visible: flags.canViewCrew },
    { id: "schedule", label: "Dagsplaner", visible: flags.canViewDagsplan },
    { id: "payroll", label: "Lønningslister", visible: flags.canViewPayroll },
    { id: "callsheets", label: "Call sheets", visible: FEATURE_CALL_SHEETS_UI && flags.canViewCallSheets },
    { id: "access", label: "Tilgang", visible: flags.canManageMemberships },
  ].filter((tab) => tab.visible);
  const activeTab = tabs.find((tab) => tab.id === requestedTab)?.id ?? tabs[0]?.id;
  const isOverview = activeTab === "overview";

  /** Hent kun det aktiv fane viser — prosjekt og valglister parallelt. */
  const [project, [agencies, customers, leadOptions]] = await Promise.all([
    getProjectById(id, {
      crew: isOverview || activeTab === "crew",
      dagsplaner: activeTab === "schedule",
      payrollLists: activeTab === "payroll",
      callSheets: activeTab === "callsheets",
    }),
    isOverview && flags.canEditProjectInfo
      ? Promise.all([getAgencyOptions(), getCustomerOptions(), user.isInternal && flags.canEditCrew ? getProjectLeadOptions() : Promise.resolve([])])
      : Promise.resolve([[], [], []] as [Awaited<ReturnType<typeof getAgencyOptions>>, Awaited<ReturnType<typeof getCustomerOptions>>, Awaited<ReturnType<typeof getProjectLeadOptions>>]),
  ]);
  if (!project) notFound();

  const leads = projectLeads(project.crew);
  const people = isOverview
    ? Array.from(new Map([...leadOptions, ...project.crew.map((row) => ({ id: row.personId, fullName: row.person.fullName, roles: row.person.roles }))].map((person) => [person.id, person])).values()).sort((a, b) => a.fullName.localeCompare(b.fullName, "nb"))
    : [];

  const customerName = project.customer?.name?.trim() ?? null;
  const agencyName = project.agency?.name?.trim() ?? null;
  const deleteLabel = formatProjectDisplayName(project);
  /** Unike e-postadresser for aktivt prosjektcrew, til «Send e-post» (mailto). */
  const crewEmails = Array.from(
    new Set(
      project.crew
        .map((row) => row.person.email?.trim())
        .filter((email): email is string => Boolean(email)),
    ),
  );

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/desk">Prosjekter</PageBackLink>
      </div>

      <PageHeader
        title={projectListLabel(project)}
        description={[agencyName, project.status === "archived" ? "Arkivert" : "Aktiv"].filter(Boolean).join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {FEATURE_CALL_SHEETS_UI && flags.canEditCallSheets ? (
              <Button variant="sidebar" asChild>
                <Link href={`/desk/projects/${project.id}/callsheets/new`}>
                  Ny call sheet
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <nav aria-label="Prosjekt" className="ap-tabs overflow-x-auto overflow-y-hidden">
        {tabs.map((tab) => (
          <Link key={tab.id} href={`/desk/projects/${project.id}?tab=${tab.id}`} scroll={false}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className="inline-flex shrink-0 items-center whitespace-nowrap">
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-4">
        {activeTab === "overview" && flags.canViewProjectInfo ? (
          <ProjectPageSection collapsible={false} title="Prosjektinfo">
            <div className="pt-2">
              <ProjectInfoSection
                canEditLeads={flags.canEditCrew}
                project={projectScalarsForClient(project)}
                customerName={customerName}
                customerLogoUrl={project.customer?.logoUrl ?? null}
                agencyName={agencyName}
                canEdit={flags.canEditProjectInfo}
                agencies={agencies}
                customers={customers}
                people={people}
                leads={leads}
              />
            </div>
          </ProjectPageSection>
        ) : null}

        {activeTab === "crew" && flags.canViewCrew ? (
        <ProjectPageSection collapsible={false} title="Prosjektcrew">
          <div className="pt-2">
            <ProjectCrewSection
              projectId={project.id}
              actions={
                <>
                  <CrewListDialog>
                    <CrewListDialogContent projectId={project.id} flags={flags} />
                  </CrewListDialog>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/desk/projects/${project.id}/befaring`}>
                      <Mail aria-hidden /> Teknisk befaring
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/desk/projects/${project.id}/oppgjor`}>
                      <Receipt aria-hidden /> Oppgjør
                    </Link>
                  </Button>
                  {crewEmails.length ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`mailto:${crewEmails.join(",")}?subject=${encodeURIComponent(projectListLabel(project))}`}>
                        <Send aria-hidden /> Send e-post
                      </a>
                    </Button>
                  ) : null}
                </>
              }
              canAdd={user.isInternal && flags.canEditCrew}
              canEdit={flags.canEditCrew}
              canEditRates={flags.canEditPayroll}
              canOpenProfile={user.isInternal}
              rows={sortProjectCrewByDepartmentOrder(project.crew).map(serializeProjectCrewRowForClient)}
            />
          </div>
        </ProjectPageSection>
        ) : null}

        {activeTab === "schedule" && flags.canViewDagsplan ? (
        <ProjectPageSection collapsible={false} title="Dagsplaner">
          {project.dagsplaner.length ? (
          <ul className="mt-2 overflow-hidden border border-border bg-card shadow-sm">
            {project.dagsplaner.map((dp, index) => (
              <li
                key={dp.id}
                className="group grid border-b border-border last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <Link
                  href={`/desk/dagsplaner/${dp.id}`}
                  className="flex min-w-0 items-center gap-4 px-4 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
                >
                  <span className="flex size-11 shrink-0 flex-col items-center justify-center border border-border bg-muted/35 text-center">
                    <span className="ap-kicker text-[9px] leading-none text-muted-foreground">
                      Dag
                    </span>
                    <span className="ap-code mt-1 text-sm font-semibold leading-none text-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-foreground">
                      {dp.title}
                    </span>
                    <time
                      dateTime={dp.shootDate.toISOString().slice(0, 10)}
                      className="ap-code mt-1 block text-muted-foreground"
                    >
                      {formatDateShort(dp.shootDate)}
                    </time>
                  </span>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border bg-muted/15 px-2 py-2 sm:border-l sm:border-t-0 sm:bg-transparent">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/desk/dagsplaner/${dp.id}/print`} target="_blank" rel="noopener noreferrer">
                      Print
                    </Link>
                  </Button>
                  {flags.canEditDagsplan ? (
                  <form action={duplicateDagsplan.bind(null, dp.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Dupliser
                    </Button>
                  </form>
                  ) : null}
                  {flags.canEditDagsplan ? (
                  <ConfirmDeleteListItem
                    title="Slette dagsplan?"
                    description={`«${dp.title}» og alt innhold i den slettes permanent.`}
                    formAction={deleteDagsplan.bind(null, dp.id)}
                  />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          ) : null}
          {!project.dagsplaner.length ? (
            <p className="pt-10 text-center text-sm text-muted-foreground">
              Ingen dagsplaner ennå. Opprett en for hver innspillingsdag.
            </p>
          ) : null}
          {flags.canEditDagsplan ? (
            <div className={project.dagsplaner.length ? "flex justify-center pt-6" : "flex justify-center pt-4"}>
              <Button variant="sidebar" asChild>
                <Link href={`/desk/projects/${project.id}/dagsplaner/new`}>
                  <Plus aria-hidden /> Ny dagsplan
                </Link>
              </Button>
            </div>
          ) : null}
        </ProjectPageSection>
        ) : null}

        {activeTab === "payroll" && flags.canViewPayroll ? (
        <ProjectPageSection collapsible={false}
          title="Lønningslister"
          headerRight={
            flags.canEditPayroll ? (
              <form
                action={createPayrollListFormAction}
                className="flex shrink-0 items-center"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <Button type="submit" variant="sidebar" size="sm">
                  Ny lønningsliste
                </Button>
              </form>
            ) : null
          }
        >
          <div className="divide-y divide-border pt-2">
            {project.payrollLists.map((pl) => (
              <div
                key={pl.id}
                className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <Link
                  href={`/desk/projects/${project.id}/lonningsliste/${pl.id}`}
                  className="min-w-0 flex-1 py-1 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{pl.title}</p>
                    <Badge variant={pl.submitted ? "success" : "warning"}>
                      {pl.submitted ? "Innsendt" : "Påbegynt"}
                    </Badge>
                  </div>
                  <p className="ap-code mt-0.5 text-muted-foreground">
                    {pl._count.rows}{" "}
                    {pl._count.rows === 1 ? "rad" : "rader"} · Oppdatert{" "}
                    {formatDateShort(pl.updatedAt)}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/desk/projects/${project.id}/lonningsliste/${pl.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </Link>
                  </Button>
                  {flags.canEditPayroll ? (
                    <ConfirmDeleteListItem
                      title="Slette lønningsliste?"
                      description={`«${pl.title}» og alle rader i den slettes permanent.`}
                      formAction={deletePayrollList.bind(
                        null,
                        project.id,
                        pl.id,
                      )}
                    />
                  ) : null}
                </div>
              </div>
            ))}
            {!project.payrollLists.length ? (
              <p className="py-4 text-sm text-muted-foreground">
                Ingen lønningslister ennå.
                {flags.canEditPayroll ? (
                  <>
                    {" "}
                    Bruk «Ny lønningsliste» til høyre.
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </ProjectPageSection>
        ) : null}

        {activeTab === "callsheets" && FEATURE_CALL_SHEETS_UI && flags.canViewCallSheets ? (
          <ProjectPageSection collapsible={false}
            title="Call sheets"
            headerRight={
              flags.canEditCallSheets ? (
              <Button variant="sidebar" size="sm" asChild>
                <Link href={`/desk/projects/${project.id}/callsheets/new`}>
                  Ny call sheet
                </Link>
              </Button>
              ) : null
            }
          >
            <div className="divide-y divide-border pt-2">
              {project.callSheets.map((cs) => (
                <div
                  key={cs.id}
                  className="flex min-h-[52px] items-center gap-2 py-3 first:pt-0"
                >
                  <Link
                    href={`/desk/callsheets/${cs.id}`}
                    className="flex min-h-[52px] min-w-0 flex-1 items-center justify-between gap-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{cs.name}</p>
                      <p className="ap-code mt-0.5 text-muted-foreground">
                        {formatDateShort(cs.date)}
                        {cs.location ? ` · ${cs.location}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={cs.status === "final" ? "default" : "secondary"}
                    >
                      {cs.status === "final" ? "Final" : "Kladd"}
                    </Badge>
                  </Link>
                  {flags.canEditCallSheets ? (
                  <ConfirmDeleteListItem
                    title="Slette call sheet?"
                    description={`«${cs.name}» og crew på denne planen slettes permanent.`}
                    formAction={deleteCallSheet.bind(null, cs.id)}
                  />
                  ) : null}
                </div>
              ))}
            </div>
            {!project.callSheets.length ? (
              <p className="py-4 text-sm text-muted-foreground">
                Ingen call sheets ennå. Opprett den første med knappen til høyre.
              </p>
            ) : null}
          </ProjectPageSection>
        ) : null}

        {activeTab === "access" ? <ProjectAccessSection projectId={project.id} flags={flags} /> : null}
      </div>

      {activeTab === "overview" && user.isInternal ? (
      <div className="mt-10 border-t border-border pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Permanent sletting av prosjektet og alle tilknyttede planer.
          </p>
          <ProjectDeleteControl projectId={project.id} label={deleteLabel} />
        </div>
      </div>
      ) : null}
    </>
  );
}
