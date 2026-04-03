import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Eye } from "lucide-react";
import {
  getCrewListShareForProject,
  getProjectCrewListPageData,
} from "@/actions/project-crew-list";
import { CrewListSharePanel } from "@/components/crew/crew-list-share-panel";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { ProjectDefaultCrewListEditor } from "@/components/project-default-crew-list-editor";
import { Button } from "@/components/ui/button";
import { getRequestOrigin } from "@/lib/request-origin";
import { formatCrewListDietaryAllergies } from "@/lib/dietary";
import {
  resolveRateForProject,
  resolveRateTypeForProject,
  resolveRoleForProject,
} from "@/lib/snapshot";
import { formatRate } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectCrewListPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProjectCrewListPageData(id);
  if (!data) notFound();

  const [share, origin] = await Promise.all([
    getCrewListShareForProject(data.project.id),
    getRequestOrigin(),
  ]);
  const shareUrl =
    share && origin
      ? `${origin}/share/crewliste/${share.token}`
      : share
        ? `/share/crewliste/${share.token}`
        : null;

  const rows = data.members.map((m) => {
    const pc = m.projectCrew;
    const p = pc.person;
    return {
      memberId: m.id,
      fullName: p.fullName,
      roleLine: resolveRoleForProject(pc),
      rateLine: formatRate(
        resolveRateForProject(pc),
        resolveRateTypeForProject(pc),
      ),
      dietaryAllergiesLine: formatCrewListDietaryAllergies(
        p.dietaryPreference,
        p.allergies,
      ),
    };
  });

  const availableToAdd = data.availableToAdd.map((pc) => ({
    projectCrewId: pc.id,
    label: `${pc.person.fullName} · ${resolveRoleForProject(pc)}`,
  }));

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${data.project.id}`}>
          {data.project.name}
        </PageBackLink>
      </div>
      <PageHeader
        title="Standard crewliste"
        description="Når du legger til folk under Prosjektcrew på prosjektsiden, havner de her (i samme rekkefølge som på prosjektet). Listen endres ikke av seg selv når du bare åpner siden — fjerner du noen her, blir de ikke lagt inn igjen automatisk; bruk nedtrekkslisten for å legge til igjen. Rekkefølgen brukes når du oppretter ny call sheet (snapshot); du kan fortsatt endre crew per call sheet."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/projects/${data.project.id}/crewliste/print`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="h-4 w-4" />
                Forhåndsvis PDF
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/projects/${data.project.id}/crewliste/print?autoPrint=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileDown className="h-4 w-4" />
                Last ned til datamaskin
              </Link>
            </Button>
          </>
        }
      />
      <CrewListSharePanel projectId={data.project.id} shareUrl={shareUrl} />
      <ProjectDefaultCrewListEditor
        projectId={data.project.id}
        rows={rows}
        availableToAdd={availableToAdd}
      />
    </>
  );
}
