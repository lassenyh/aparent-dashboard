import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { CallSheetNewForm } from "@/components/forms/call-sheet-new-form";
import {
  assertPermission,
  requireProjectAccess,
} from "@/lib/project-access";

type PageProps = { params: Promise<{ id: string }> };

export default async function NewCallSheetPage({ params }: PageProps) {
  if (!FEATURE_CALL_SHEETS_UI) notFound();
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const { flags } = await requireProjectAccess(id);
  assertPermission(flags, "canEditCallSheets");

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${project.id}`}>{project.name}</PageBackLink>
      </div>
      <PageHeader
        title="Ny call sheet"
        description="Crew fra prosjektets standard crewliste legges inn automatisk (som snapshot). Du kan legge til eller fjerne folk på call sheet etterpå."
      />
      <CallSheetNewForm projectId={project.id} />
    </>
  );
}
