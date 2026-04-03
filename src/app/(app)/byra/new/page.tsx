import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { AgencyNewForm } from "@/components/forms/agency-new-form";
import { requireInternalUser } from "@/lib/project-access";

export default async function NewAgencyPage() {
  await requireInternalUser();
  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/byra">Byrå</PageBackLink>
      </div>
      <PageHeader
        title="Nytt byrå"
        description="Logo vises på call sheet PDF sammen med org.nr."
      />
      <AgencyNewForm />
    </>
  );
}
