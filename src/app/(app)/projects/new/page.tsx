import { getProjectLeadOptions } from "@/actions/projects";
import { getAgencyOptions } from "@/actions/agencies";
import { getCustomerOptions } from "@/actions/customers";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { ProjectNewForm } from "@/components/forms/project-new-form";
import { requireInternalUser } from "@/lib/project-access";

export default async function NewProjectPage() {
  await requireInternalUser();
  const [agencies, customers, people] = await Promise.all([
    getAgencyOptions(),
    getCustomerOptions(),
    getProjectLeadOptions(),
  ]);

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/">Tilbake</PageBackLink>
      </div>
      <PageHeader
        kicker="Prosjekt"
        title="Nytt prosjekt"
        description="Koble kunde og byrå fra registeret. Crew legges til på prosjektsiden."
      />
      <ProjectNewForm agencies={agencies} customers={customers} people={people} />
    </>
  );
}
