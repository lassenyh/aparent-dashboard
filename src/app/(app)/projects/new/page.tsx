import { getAgencyOptions } from "@/actions/agencies";
import { getCustomerOptions } from "@/actions/customers";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { ProjectNewForm } from "@/components/forms/project-new-form";

export default async function NewProjectPage() {
  const [agencies, customers] = await Promise.all([
    getAgencyOptions(),
    getCustomerOptions(),
  ]);

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/">Tilbake</PageBackLink>
      </div>
      <PageHeader
        title="Nytt prosjekt"
        description="Koble kunde og byrå fra registeret. Crew legges til på prosjektsiden."
      />
      <ProjectNewForm agencies={agencies} customers={customers} />
    </>
  );
}
