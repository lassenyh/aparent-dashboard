import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createPayrollListFormAction,
  deletePayrollList,
  getPayrollListIndexData,
} from "@/actions/payroll";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { ConfirmDeleteListItem } from "@/components/confirm-delete-list-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateShort } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function PayrollListsIndexPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPayrollListIndexData(id);
  if (!data) notFound();

  const { project, lists } = data;

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/projects/${project.id}`}>{project.name}</PageBackLink>
      </div>
      <PageHeader
        title="Lønningslister"
        description="Opprett én liste per oppgjør eller periode. Rediger rader, merk som innsendt når den er sendt til regnskapsfører."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 px-4 py-4">
        <form action={createPayrollListFormAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="space-y-1.5">
            <Label htmlFor="new-payroll-title">Ny liste (valgfritt navn)</Label>
            <Input
              id="new-payroll-title"
              name="title"
              placeholder="F.eks. Innspilling uke 12"
              className="w-[min(100vw-2rem,320px)]"
            />
          </div>
          <Button type="submit" size="sm">
            Ny lønningsliste
          </Button>
        </form>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {lists.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Ingen lønningslister ennå. Opprett den første med skjemaet over.
          </p>
        ) : (
          lists.map((list) => (
            <div
              key={list.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <Link
                href={`/projects/${project.id}/lonningsliste/${list.id}`}
                className="min-w-0 flex-1 rounded-md py-1 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{list.title}</p>
                  <Badge variant={list.submitted ? "success" : "warning"}>
                    {list.submitted ? "Innsendt" : "Påbegynt"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {list._count.rows}{" "}
                  {list._count.rows === 1 ? "rad" : "rader"} · Oppdatert{" "}
                  {formatDateShort(list.updatedAt)}
                </p>
              </Link>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={`/projects/${project.id}/lonningsliste/${list.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </Link>
                </Button>
                <ConfirmDeleteListItem
                  title="Slette lønningsliste?"
                  description={`«${list.title}» og alle rader i den slettes permanent.`}
                  formAction={deletePayrollList.bind(null, project.id, list.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
