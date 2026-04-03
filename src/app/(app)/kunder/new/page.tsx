import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { CustomerNewForm } from "@/components/forms/customer-new-form";
import { requireInternalUser } from "@/lib/project-access";

export default async function NewCustomerPage() {
  await requireInternalUser();
  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/kunder">Kunder</PageBackLink>
      </div>
      <PageHeader
        title="Ny kunde"
        description="Logo vises på prosjektsiden og på call sheet PDF."
      />
      <CustomerNewForm />
    </>
  );
}
