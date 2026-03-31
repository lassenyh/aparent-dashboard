import { notFound } from "next/navigation";
import { deleteAgency, getAgencyById } from "@/actions/agencies";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { AgencyEditForm } from "@/components/forms/agency-edit-form";
import { Button } from "@/components/ui/button";

type PageProps = { params: Promise<{ id: string }> };

export default async function AgencyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const agency = await getAgencyById(id);
  if (!agency) notFound();

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/byra">Byrå</PageBackLink>
      </div>
      <PageHeader
        title={agency.name}
        description={
          agency.orgNumber
            ? `Org.nr ${agency.orgNumber} · ${agency._count.projects} prosjekt`
            : `${agency._count.projects} prosjekt`
        }
      />
      <AgencyEditForm agency={agency} />
      <form
        action={deleteAgency.bind(null, agency.id)}
        className="mt-10 max-w-lg border-t border-border pt-8"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Sletter byrået. Prosjekter beholder data, men mister kobling til
          byrå.
        </p>
        <Button type="submit" variant="destructive" size="sm">
          Slett byrå
        </Button>
      </form>
    </>
  );
}
