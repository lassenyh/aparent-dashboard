import Link from "next/link";
import { Plus } from "lucide-react";
import { getProjectsList } from "@/actions/projects";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { formatDateShort, formatProjectDisplayName } from "@/lib/utils";

export default async function HomePage() {
  const [projects, user] = await Promise.all([
    getProjectsList(),
    getSessionDashboardUser(),
  ]);
  const isInternal = user?.isInternal ?? false;

  return (
    <>
      <PageHeader
        title="Prosjekter"
        actions={
          isInternal ? (
            <Button variant="sidebar" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Nytt prosjekt
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="divide-y divide-border">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex min-h-[56px] flex-col gap-2 py-4 transition-colors first:pt-0 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {p.customer?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.customer.logoUrl}
                  alt=""
                  className="mt-0.5 h-8 w-20 shrink-0 object-contain object-left"
                />
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {formatProjectDisplayName(p)}
                  </span>
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>
                    {p.status === "active" ? "Aktiv" : "Arkivert"}
                  </Badge>
                </div>
                {p.customer?.name && !p.customer?.logoUrl ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.customer.name}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-4 text-sm text-muted-foreground sm:justify-end">
              <span>{p._count.crew} crew</span>
              {FEATURE_CALL_SHEETS_UI ? (
                <span>{p._count.callSheets} call sheets</span>
              ) : null}
              {p.startDate ? <span>{formatDateShort(p.startDate)}</span> : null}
            </div>
          </Link>
        ))}
      </div>
      {!projects.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ingen prosjekter ennå.
        </p>
      ) : null}
    </>
  );
}
