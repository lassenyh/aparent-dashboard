import { notFound } from "next/navigation";
import { Input } from "@/components/ui/input";
import { requireProjectAccess } from "@/lib/project-access";
import { getPayrollPageData } from "@/actions/payroll";
import { PayrollFeesForm } from "@/components/payroll-fees-form";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { PayrollListEditorLoader } from "@/components/payroll-list-editor-loader";

type PageProps = { params: Promise<{ id: string; listId: string }> };

export default async function PayrollListDetailPage({ params }: PageProps) {
  const { id, listId } = await params;
  const data = await getPayrollPageData(id, listId, {
    maskSensitiveForUi: true,
  });
  if (!data) notFound();

  const { flags } = await requireProjectAccess(id);
  if (!flags.canEditPayroll || !flags.canViewSensitiveData) return <>
    <PageBackLink href={`/projects/${id}?tab=payroll`}>{data.project.name}</PageBackLink>
    <PageHeader title={data.listTitle} description={flags.canEditPayroll ? "Du kan endre honorarer. Person- og kontonummer forvaltes av administrator." : "Du har lesetilgang til denne lønningslisten."} />
    <PayrollFeesForm projectId={id} listId={listId} canSave={flags.canEditPayroll && !data.submitted && data.rows.length > 0}>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="p-3">Navn</th><th className="p-3">E-post</th><th className="p-3">Honorar (NOK)</th></tr></thead><tbody>{data.rows.map(row => <tr key={row.id} className="border-b border-border"><td className="p-3">{row.isSectionHeader ? row.sectionTitle : row.fullName}</td><td className="p-3">{row.email}</td><td className="p-3">{!row.isSectionHeader && (flags.canEditPayroll && !data.submitted ? <Input aria-label={`Honorar for ${row.fullName}`} type="number" min="0" max="99999999" step="0.01" name={`fee-${row.id}`} defaultValue={row.honorar ?? ""} /> : row.honorar?.toLocaleString("nb-NO"))}</td></tr>)}</tbody></table></div>
      {!data.rows.length && <p className="text-sm text-muted-foreground">Listen er tom. Administrator kan legge til personer.</p>}
    </PayrollFeesForm>
  </>;

  // Etter dette punktet er databasen OK; feil i UI er ofte klient/rendering (søk APARENT_PAYROLL_PAGE i logs).
  console.log(
    `APARENT_PAYROLL_PAGE_READY projectId=${id} listId=${listId} rows=${data.rows.length}`,
  );

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
    dietaryPreference: r.dietaryPreference,
  }));

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${data.project.id}/lonningsliste`}>
          Lønningslister
        </PageBackLink>
      </div>
      <PageHeader
        kicker="Lønn"
        title="Lønningsliste"
        description="Gi listen et navn, fyll inn rader og merk som innsendt når den er sendt til regnskapsfører. Lagre når du er klar."
      />
      <PayrollListEditorLoader
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
