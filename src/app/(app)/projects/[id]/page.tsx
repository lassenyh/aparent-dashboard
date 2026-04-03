import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgencyOptions } from "@/actions/agencies";
import { getCustomerOptions } from "@/actions/customers";
import { getProjectById } from "@/actions/projects";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { ProjectInfoSection } from "@/components/project-info-section";
import { ProjectPageSection } from "@/components/project-page-section";
import { ProjectCrewPicker } from "@/components/project-crew-picker";
import { ProjectCrewList } from "@/components/project-crew-list";
import { ProjectDeleteControl } from "@/components/project-delete-control";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLogoImg } from "@/components/public-logo-img";
import { cn, formatDateShort, formatProjectDisplayName } from "@/lib/utils";
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

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const user = await getSessionDashboardUser();
  if (!user) notFound();
  const flags = await getProjectAccessForUser(user, id);
  if (!flags) notFound();

  const [agencies, customers] = flags.canEditProjectInfo
    ? await Promise.all([getAgencyOptions(), getCustomerOptions()])
    : [[], []];

  const customerName = project.customer?.name?.trim() ?? null;
  const agencyName = project.agency?.name?.trim() ?? null;
  const customerHasLogo = Boolean(project.customer?.logoUrl);
  const projectName = project.name.trim();
  const internalTitle = project.internalTitle?.trim();

  /** Undertekst når kundelogo er sidetittel: prosjektnummer + prosjektnavn. */
  const lineUnderCustomerLogo = formatProjectDisplayName(project);

  const descParts: string[] = [];
  if (!customerHasLogo) {
    if (customerName) descParts.push(customerName);
    if (internalTitle) descParts.push(internalTitle);
  }

  const headerDescription = customerHasLogo
    ? lineUnderCustomerLogo
    : descParts.length > 0
      ? descParts.join(" · ")
      : "Prosjektdetaljer og crew.";

  const headerScreenReader =
    customerHasLogo && project.customer?.logoUrl
      ? [project.name, internalTitle].filter(Boolean).join(" · ")
      : undefined;

  const deleteLabel = formatProjectDisplayName(project);

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/">Prosjekter</PageBackLink>
      </div>

      <PageHeader
        branding={
          customerHasLogo && project.customer?.logoUrl ? (
            <PublicLogoImg
              src={project.customer.logoUrl}
              alt={customerName ? customerName : "Kunde"}
              className="h-14 max-w-[240px] object-contain object-left"
            />
          ) : undefined
        }
        title={!customerHasLogo ? project.name : undefined}
        screenReaderTitle={headerScreenReader}
        description={headerDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flags.canViewCrew ? (
              <Button variant="outline" asChild>
                <Link href={`/projects/${project.id}/crewliste`}>
                  Crewliste
                </Link>
              </Button>
            ) : null}
            {FEATURE_CALL_SHEETS_UI && flags.canEditCallSheets ? (
              <Button variant="sidebar" asChild>
                <Link href={`/projects/${project.id}/callsheets/new`}>
                  Ny call sheet
                </Link>
              </Button>
            ) : null}
            {flags.canEditDagsplan ? (
              <Button variant="sidebar" asChild>
                <Link href={`/projects/${project.id}/dagsplaner/new`}>
                  Ny dagsplan
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {project.customer &&
      !project.customer.logoUrl &&
      project.customer.name ? (
        <div className="mb-8 flex flex-wrap items-end gap-8 border-b border-border pb-8">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Kunde</p>
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {project.customer.name}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {flags.canViewProjectInfo ? (
          <ProjectPageSection title="Prosjektinfo">
            <div className="pt-2">
              <ProjectInfoSection
                project={projectScalarsForClient(project)}
                customerName={customerName}
                agencyName={agencyName}
                canEdit={flags.canEditProjectInfo}
                agencies={agencies}
                customers={customers}
              />
            </div>
          </ProjectPageSection>
        ) : null}

        {flags.canViewCrew ? (
        <ProjectPageSection title="Prosjektcrew">
          <div className="pt-2">
            <div
              className={cn(
                "mb-3 flex flex-wrap items-center gap-2",
                project.crew.length > 0 && "border-b border-border pb-3",
              )}
            >
              {flags.canEditCrew ? (
                <ProjectCrewPicker projectId={project.id} />
              ) : null}
            </div>
            <ProjectCrewList
              rows={project.crew.map(serializeProjectCrewRowForClient)}
            />
            {!project.crew.length ? (
              <p className="py-4 text-sm text-muted-foreground">
                Ingen crew ennå.
                {flags.canEditCrew
                  ? " Bruk «Legg til fra database» over."
                  : ""}
              </p>
            ) : null}
          </div>
        </ProjectPageSection>
        ) : null}

        {flags.canViewDagsplan ? (
        <ProjectPageSection
          title="Dagsplaner"
          headerRight={
            flags.canEditDagsplan ? (
            <Button variant="sidebar" size="sm" asChild>
              <Link href={`/projects/${project.id}/dagsplaner/new`}>
                Ny dagsplan
              </Link>
            </Button>
            ) : null
          }
        >
          <div className="divide-y divide-border pt-2">
            {project.dagsplaner.map((dp) => (
              <div
                key={dp.id}
                className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <Link
                  href={`/dagsplaner/${dp.id}`}
                  className="min-w-0 flex-1 transition-colors hover:text-foreground"
                >
                  <p className="font-medium text-foreground">{dp.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatDateShort(dp.shootDate)}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dagsplaner/${dp.id}/print`} target="_blank">
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
              </div>
            ))}
          </div>
          {!project.dagsplaner.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              Ingen dagsplaner ennå. Opprett en for hver innspillingsdag.
            </p>
          ) : null}
        </ProjectPageSection>
        ) : null}

        {flags.canViewPayroll ? (
        <ProjectPageSection
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
                  href={`/projects/${project.id}/lonningsliste/${pl.id}`}
                  className="min-w-0 flex-1 rounded-md py-1 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{pl.title}</p>
                    <Badge variant={pl.submitted ? "success" : "warning"}>
                      {pl.submitted ? "Innsendt" : "Påbegynt"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {pl._count.rows}{" "}
                    {pl._count.rows === 1 ? "rad" : "rader"} · Oppdatert{" "}
                    {formatDateShort(pl.updatedAt)}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/projects/${project.id}/lonningsliste/${pl.id}/print`}
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

        {FEATURE_CALL_SHEETS_UI && flags.canViewCallSheets ? (
          <ProjectPageSection
            title="Call sheets"
            headerRight={
              flags.canEditCallSheets ? (
              <Button variant="sidebar" size="sm" asChild>
                <Link href={`/projects/${project.id}/callsheets/new`}>
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
                    href={`/callsheets/${cs.id}`}
                    className="flex min-h-[52px] min-w-0 flex-1 items-center justify-between gap-4 rounded-md transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{cs.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
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

        <ProjectAccessSection projectId={project.id} flags={flags} />
      </div>

      {user.isInternal ? (
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
