import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { CrewListImportClient } from "@/components/crew/crew-list-import-client";
import { PageBackLink } from "@/components/page-back-link";
import { PageHeader } from "@/components/page-header";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { getProjectAccessForUser } from "@/lib/project-access";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectImportCrewPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getSessionDashboardUser();
  if (!user) notFound();
  const flags = await getProjectAccessForUser(user, id);
  if (!flags) notFound();
  if (!user.isInternal && !flags.canImportCrewDatabase) notFound();

  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${id}`}>{project.name}</PageBackLink>
      </div>
      <PageHeader
        title="Importer crew til databasen og prosjektet"
        description="Samme flyt som under Crew → Importer: PDF eller limt tekst. Nye personer opprettes i crew-databasen og kobles til dette prosjektet (første rolle fra listen brukes som rolle på prosjektet). Duplikater i databasen hoppes over."
      />
      <CrewListImportClient projectId={id} />
    </>
  );
}
