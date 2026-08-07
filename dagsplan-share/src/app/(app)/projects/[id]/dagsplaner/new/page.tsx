import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { DagsplanNewForm } from "@/components/dagsplan/dagsplan-new-form";
import {
  assertPermission,
  requireProjectAccess,
} from "@/lib/project-access";

type PageProps = { params: Promise<{ id: string }> };

export default async function NewDagsplanPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const { flags } = await requireProjectAccess(id);
  assertPermission(flags, "canEditDagsplan");

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${project.id}`}>{project.name}</PageBackLink>
      </div>
      <PageHeader
        title="Ny dagsplan"
        description="Operativ plan for én innspillingsdag. Du kan duplisere og tilpasse senere."
      />
      <DagsplanNewForm projectId={project.id} />
    </>
  );
}
