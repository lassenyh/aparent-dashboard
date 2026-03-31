import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Printer } from "lucide-react";
import {
  deleteCallSheet,
  duplicateCallSheet,
  getAvailableProjectCrewForCallSheet,
  getCallSheetById,
} from "@/actions/callsheets";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { SectionHeading } from "@/components/section-heading";
import { CallSheetHeaderForm } from "@/components/forms/call-sheet-header-form";
import { CallSheetAddCrew } from "@/components/call-sheet-add-crew";
import { CallSheetCrewTable } from "@/components/call-sheet-crew-table";
import { ConfirmDeleteListItem } from "@/components/confirm-delete-list-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveRoleForProject } from "@/lib/snapshot";
import {
  callSheetScalarsForClient,
  serializeCallSheetCrewRow,
} from "@/lib/serialize";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";

type PageProps = { params: Promise<{ id: string }> };

export default async function CallSheetEditorPage({ params }: PageProps) {
  if (!FEATURE_CALL_SHEETS_UI) notFound();
  const { id } = await params;
  const sheet = await getCallSheetById(id);
  if (!sheet) notFound();

  const available = await getAvailableProjectCrewForCallSheet(id);
  const addOptions = available.map((pc) => ({
    projectCrewId: pc.id,
    label: `${pc.person.fullName} · ${resolveRoleForProject(pc)}`,
  }));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <PageBackLink href={`/projects/${sheet.projectId}`}>
          {sheet.project.name}
        </PageBackLink>
        <Badge variant={sheet.status === "final" ? "default" : "secondary"}>
          {sheet.status === "final" ? "Final" : "Kladd"}
        </Badge>
      </div>

      <PageHeader
        title={sheet.name}
        description={`${sheet.project.name} · Snapshot-basert crewliste.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/callsheets/${sheet.id}/print`} target="_blank">
                <Printer className="h-4 w-4" />
                Print / PDF
              </Link>
            </Button>
            <form action={duplicateCallSheet.bind(null, sheet.id)}>
              <Button type="submit" variant="secondary">
                <Copy className="h-4 w-4" />
                Dupliser
              </Button>
            </form>
            <ConfirmDeleteListItem
              title="Slette call sheet?"
              description={`«${sheet.name}» og crew på denne planen slettes permanent.`}
              formAction={deleteCallSheet.bind(null, sheet.id)}
            />
          </div>
        }
      />

      <div className="space-y-10">
        <section>
          <SectionHeading>Innhold</SectionHeading>
          <CallSheetHeaderForm
            sheet={callSheetScalarsForClient(sheet)}
            projectId={sheet.projectId}
          />
        </section>

        <section>
          <SectionHeading>Crew</SectionHeading>
          <div className="mb-6">
            <CallSheetAddCrew callSheetId={sheet.id} options={addOptions} />
          </div>
          <CallSheetCrewTable
            callSheetId={sheet.id}
            rows={sheet.crew.map(serializeCallSheetCrewRow)}
          />
        </section>
      </div>
    </>
  );
}
