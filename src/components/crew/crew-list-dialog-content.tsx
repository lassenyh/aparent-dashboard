import Link from "next/link";
import { FileDown } from "lucide-react";
import {
  getCrewListShareForProject,
  getProjectCrewListPageData,
} from "@/actions/project-crew-list";
import { CrewListShareLink } from "@/components/crew/crew-list-share-link";
import { ProjectCrewListWeb } from "@/components/crew/project-crew-list-web";
import { ProjectDefaultCrewListEditor } from "@/components/project-default-crew-list-editor";
import { Button } from "@/components/ui/button";
import { toCrewListSharePayload } from "@/lib/crew-list-share-payload";
import { formatCrewListDietaryAllergies } from "@/lib/dietary";
import type { ProjectAccessFlags } from "@/lib/project-access";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  resolveRateForProject,
  resolveRateTypeForProject,
  resolveRoleForProject,
} from "@/lib/snapshot";
import { formatRate } from "@/lib/utils";

/** Innholdet i «Del crewliste»-popupen: delingslenke, nedlasting, forhåndsvisning og redigering. */
export async function CrewListDialogContent({
  projectId,
  flags,
}: {
  projectId: string;
  flags: ProjectAccessFlags;
}) {
  const [data, share, origin] = await Promise.all([
    getProjectCrewListPageData(projectId),
    getCrewListShareForProject(projectId),
    getRequestOrigin(),
  ]);
  if (!data) return null;

  const shareUrl = share
    ? origin
      ? `${origin}/share/crewliste/${share.token}`
      : `/share/crewliste/${share.token}`
    : null;

  const rows = data.members.map((m) => {
    const pc = m.projectCrew;
    const p = pc.person;
    return {
      memberId: m.id,
      fullName: p.fullName,
      roleLine: resolveRoleForProject(pc),
      rateLine: formatRate(resolveRateForProject(pc), resolveRateTypeForProject(pc)),
      dietaryAllergiesLine: formatCrewListDietaryAllergies(p.dietaryPreference, p.allergies),
    };
  });
  const availableToAdd = data.availableToAdd.map((pc) => ({
    projectCrewId: pc.id,
    label: `${pc.person.fullName} · ${resolveRoleForProject(pc)}`,
  }));

  return (
    <div className="space-y-5 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          {flags.canManageMemberships ? (
            <CrewListShareLink projectId={projectId} shareUrl={shareUrl} />
          ) : null}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/desk/projects/${projectId}/crewliste/print?autoPrint=1`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown className="h-4 w-4" />
            Last ned
          </Link>
        </Button>
      </div>
      <ProjectCrewListWeb data={toCrewListSharePayload(data)} />
      {flags.canEditCrew ? (
        <details className="border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Rediger crewliste</summary>
          <div className="border-t border-border p-4">
            <ProjectDefaultCrewListEditor projectId={projectId} rows={rows} availableToAdd={availableToAdd} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
