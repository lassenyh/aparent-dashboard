import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePerson, getPersonById } from "@/actions/crew";
import { getPersonSensitiveMaskedDisplay } from "@/actions/crew-sensitive";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { SectionHeading } from "@/components/section-heading";
import { CrewEditForm } from "@/components/forms/crew-edit-form";
import { ConfirmDeleteListItem } from "@/components/confirm-delete-list-item";
import { Badge } from "@/components/ui/badge";
import { serializePersonForClient } from "@/lib/serialize";
import { requireInternalUser } from "@/lib/project-access";

type PageProps = { params: Promise<{ id: string }> };

export default async function CrewDetailPage({ params }: PageProps) {
  await requireInternalUser();
  const { id } = await params;
  const person = await getPersonById(id);
  if (!person) notFound();

  const sensitive = await getPersonSensitiveMaskedDisplay(id);
  if (!sensitive) notFound();

  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/crew">Tilbake</PageBackLink>
      </div>
      <PageHeader title={person.fullName} />
      <CrewEditForm
        person={serializePersonForClient(person)}
        sensitiveInitial={sensitive}
      />

      {person.projectCrews.length ? (
        <section className="mt-10 max-w-lg border-t border-border pt-10">
          <SectionHeading>Prosjekter</SectionHeading>
          <p className="mb-4 text-sm text-muted-foreground">
            Aktive koblinger til prosjektcrew.
          </p>
          <div className="divide-y divide-border">
            {person.projectCrews.map((pc) => (
              <Link
                key={pc.id}
                href={`/projects/${pc.project.id}`}
                className="flex min-h-[48px] items-center justify-between gap-4 py-3 transition-colors first:pt-0 hover:bg-muted/40"
              >
                <span className="font-medium text-foreground">{pc.project.name}</span>
                <Badge variant="outline">{pc.project.status}</Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 max-w-lg border-t border-border pt-8">
        <p className="mb-4 text-sm text-muted-foreground">
          Slett personen helt fra crew-databasen. Vedkommende fjernes fra alle
          prosjekter og call sheets. Lønningslister beholder radene, men uten
          kobling til denne profilen.
        </p>
        <ConfirmDeleteListItem
          title="Slette person?"
          description={`«${person.fullName}» slettes permanent og kan ikke angres.`}
          formAction={deletePerson.bind(null, person.id)}
        />
      </div>
    </>
  );
}
