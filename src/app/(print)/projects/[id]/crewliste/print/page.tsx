import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectCrewListPageData } from "@/actions/project-crew-list";
import { toCrewListSharePayload } from "@/lib/crew-list-share-payload";
import { ProjectCrewListReadonlyTable } from "@/components/crew/project-crew-list-readonly-table";
import { PayrollPrintAutoPrint } from "@/components/payroll-print-auto-print";
import { PrintToolbar } from "@/components/print-toolbar";
import { formatProjectDisplayName } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectCrewListPrintPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProjectCrewListPageData(id);
  if (!data) notFound();

  const subtitle = formatProjectDisplayName(data.project);
  const payload = toCrewListSharePayload(data);

  return (
    <div className="mx-auto max-w-[210mm] px-6 py-10 text-neutral-900 antialiased print:max-w-none print:px-8 print:py-6">
      <Suspense fallback={null}>
        <PayrollPrintAutoPrint />
      </Suspense>

      <PrintToolbar backHref={`/projects/${id}/crewliste`} />

      <header className="mb-8 border-b border-neutral-200 pb-6 print:mb-6 print:pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          Standard crewliste
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 print:text-xl">
          {data.project.name}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
      </header>

      <ProjectCrewListReadonlyTable rows={payload.rows} />
    </div>
  );
}
