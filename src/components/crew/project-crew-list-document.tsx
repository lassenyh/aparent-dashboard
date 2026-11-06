import { AparentLogo } from "@/components/aparent-logo";
import type { CrewListSharePayload } from "@/lib/crew-list-share-payload";
import { formatProjectDisplayName } from "@/lib/utils";
import { ProjectCrewListReadonlyTable } from "@/components/crew/project-crew-list-readonly-table";

/** Felles dokumentinnhold for forhåndsvisning og PDF. */
export function ProjectCrewListDocument({ data }: { data: CrewListSharePayload }) {
  return <>
    <header className="mb-8 border-b border-neutral-200 pb-6 print:mb-6 print:pb-4">
      <div className="flex items-center justify-between gap-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Crewliste</p>
        <AparentLogo className="w-[140px] shrink-0 object-right" />
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 print:text-xl">{data.project.name}</h1>
      <p className="mt-2 text-sm text-neutral-600">{formatProjectDisplayName(data.project)}</p>
    </header>
    <ProjectCrewListReadonlyTable rows={data.rows} />
  </>;
}
