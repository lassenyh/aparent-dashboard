import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { AgencyNewForm } from "@/components/forms/agency-new-form";

export default function NewAgencyPage() {
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
