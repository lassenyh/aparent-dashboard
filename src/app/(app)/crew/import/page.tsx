import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { CrewListImportClient } from "@/components/crew/crew-list-import-client";

export default function CrewImportPage() {
  return (
    <>
      <div className="mb-6">
        <PageBackLink href="/crew">Crew-database</PageBackLink>
      </div>
      <PageHeader
        title="Importer crew fra PDF eller tekst"
        description="Last opp PDF eller lim inn tekst. PDF med «CREW INFO» (f.eks. dagsplan): avdelingstype, navn og mobil. Ellers tabell/stabsliste: (1) yrke/rolle, (2) navn, deretter telefon og e-post. Du godkjenner før opprettelse. Duplikater hoppes over."
      />
      <CrewListImportClient />
    </>
  );
}
