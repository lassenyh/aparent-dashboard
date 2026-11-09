import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { CrewNewForm } from "@/components/forms/crew-new-form";
import { requireInternalUser } from "@/lib/project-access";
import { getCrewFilterOptions } from "@/actions/crew";

export default async function NewCrewPage() {
  await requireInternalUser();
  const { roles } = await getCrewFilterOptions();
  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/desk/crew">Tilbake til crew</PageBackLink>
      </div>
      <PageHeader
        kicker="Crew"
        title="Ny person"
        description="Opprett én gang — bruk på mange prosjekter og call sheets."
      />
      <CrewNewForm roleOptions={roles} />
    </>
  );
}
