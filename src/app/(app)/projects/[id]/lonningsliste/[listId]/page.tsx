import { notFound } from "next/navigation";
import { getPayrollPageData } from "@/actions/payroll";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { PayrollListEditor } from "@/components/payroll-list-editor";

type PageProps = { params: Promise<{ id: string; listId: string }> };

export default async function PayrollListDetailPage({ params }: PageProps) {
  const { id, listId } = await params;
  const data = await getPayrollPageData(id, listId, {
    maskSensitiveForUi: true,
  });
  if (!data) notFound();

  const initialRows = data.rows.map((r) => ({
    id: r.id,
    isSectionHeader: r.isSectionHeader,
    sectionTitle: r.sectionTitle,
    personId: r.personId,
    fullName: r.fullName,
    projectLabel: r.projectLabel,
    addressLine: r.addressLine,
    postalCode: r.postalCode,
    city: r.city,
    country: r.country,
    honorar: r.honorar,
    includesHolidayPay: r.includesHolidayPay,
    nationalId: r.nationalId,
    bankAccount: r.bankAccount,
    mobile: r.mobile,
    email: r.email,
    sensitiveFieldsMaskInUi: r.sensitiveFieldsMaskInUi,
    segment: r.segment,
  }));

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${data.project.id}/lonningsliste`}>
          Lønningslister
        </PageBackLink>
      </div>
      <PageHeader
        title="Lønningsliste"
        description="Gi listen et navn, fyll inn rader og merk som innsendt når den er sendt til regnskapsfører. Lagre når du er klar."
      />
      <PayrollListEditor
        key={`${data.listId}-${data.listUpdatedAt}`}
        projectId={data.project.id}
        listId={data.listId}
        initialTitle={data.listTitle}
        initialSubmitted={data.submitted}
        defaultProjectLabel={data.defaultProjectLabel}
        initialRows={initialRows}
        crew={data.crew}
      />
    </>
  );
}
