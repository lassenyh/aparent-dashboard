import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectCrewListPageData } from "@/actions/project-crew-list";
import { toCrewListSharePayload } from "@/lib/crew-list-share-payload";
import { ProjectCrewListDocument } from "@/components/crew/project-crew-list-document";
import { PayrollPrintAutoPrint } from "@/components/payroll-print-auto-print";
import { PrintToolbar } from "@/components/print-toolbar";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectCrewListPrintPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProjectCrewListPageData(id);
  if (!data) notFound();

  const payload = toCrewListSharePayload(data);

  return (
    <div className="mx-auto max-w-[210mm] px-6 py-10 text-neutral-900 antialiased print:max-w-none print:px-8 print:py-6">
      <Suspense fallback={null}>
        <PayrollPrintAutoPrint />
      </Suspense>

      <PrintToolbar backHref={`/projects/${id}/crewliste`} />

      <ProjectCrewListDocument data={payload} />
    </div>
  );
}
