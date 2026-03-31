import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { CrewNewForm } from "@/components/forms/crew-new-form";

export default function NewCrewPage() {
  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/crew">Tilbake til crew</PageBackLink>
      </div>
      <PageHeader
        title="Ny person"
        description="Opprett én gang — bruk på mange prosjekter og call sheets."
      />
      <CrewNewForm />
    </>
  );
}
