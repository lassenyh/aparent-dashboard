import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, Plus, Search } from "lucide-react";
import { getProjectsList } from "@/actions/projects";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { formatDateShort } from "@/lib/utils";
import { compareProjectNumbers, projectListLabel } from "@/lib/project-list-presentation";

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ order?: string | string[]; q?: string | string[]; customer?: string | string[] }>;
}) {
  const [projects, user, parameters] = await Promise.all([
    getProjectsList(),
    getSessionDashboardUser(),
    searchParams,
  ]);
  const order = parameters.order === "desc" ? "desc" : "asc";
  const query = typeof parameters.q === "string" ? parameters.q.trim().slice(0, 200) : "";
  const customerId = typeof parameters.customer === "string" ? parameters.customer : "";
  const customers = Array.from(new Map(projects.flatMap((project) =>
    project.customerId && project.customer
      ? [[project.customerId, project.customer.name] as const]
      : [],
  )).entries()).sort((a, b) => a[1].localeCompare(b[1], "nb"));
  const normalizedQuery = query.toLocaleLowerCase("nb");
  const sortedProjects = projects.filter((project) =>
    (!customerId || project.customerId === customerId) &&
    (!normalizedQuery || projectListLabel(project).toLocaleLowerCase("nb").includes(normalizedQuery)),
  ).sort((a, b) => compareProjectNumbers(a, b, order));
  const sortParams = new URLSearchParams({ order: order === "asc" ? "desc" : "asc" });
  if (query) sortParams.set("q", query);
  if (customerId) sortParams.set("customer", customerId);
  const SortIcon = order === "asc" ? ArrowUp : ArrowDown;
  const sortHeader = (
    <th scope="col" aria-sort={order === "asc" ? "ascending" : "descending"}>
      <Link
        href={`/?${sortParams}`}
        scroll={false}
        className="inline-flex items-center gap-2 hover:text-foreground"
        aria-label={`Prosjekt: sorter etter ${order === "asc" ? "høyeste" : "laveste"} prosjektnummer først`}
      >
        Prosjekt <SortIcon className="size-3" aria-hidden="true" />
      </Link>
    </th>
  );
  const isInternal = user?.isInternal ?? false;
  const activeProjects = sortedProjects.filter((p) => p.status === "active");
  const archivedProjects = sortedProjects.filter((p) => p.status === "archived");

  return (
    <>
      <PageHeader
        title="Prosjekter"
        actions={
          isInternal ? (
            <Button variant="default" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Nytt prosjekt
              </Link>
            </Button>
          ) : null
        }
      />

      <form action="/" method="get" className="ap-filter-bar max-w-3xl">
        <input type="hidden" name="order" value={order} />
        <div className="relative min-w-[180px] flex-1">
          <Search aria-hidden="true" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input key={query} name="q" defaultValue={query} placeholder="Søk i prosjekter" aria-label="Søk i prosjektnummer, kunde eller prosjektnavn" className="pl-8" />
        </div>
        <select key={customerId} name="customer" defaultValue={customerId} aria-label="Filtrer etter kunde" className="max-w-full">
          <option value="">Alle kunder</option>
          {customers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <Button type="submit" variant="outline">Filtrer</Button>
        {query || customerId ? <Link href={`/?order=${order}`} className="text-[12px] text-muted-foreground hover:text-foreground hover:underline">Nullstill</Link> : null}
      </form>

      <div className="space-y-6">
        <div className="ap-table-wrap">
          {activeProjects.length ? (
            <table className="ap-table">
              <thead>
                <tr>
                  {sortHeader}
                  <th scope="col">Byrå</th>
                  <th>Crew</th>
                  {FEATURE_CALL_SHEETS_UI ? <th>Call sheets</th> : null}
                  <th>Start</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/projects/${p.id}`}
                        className="inline-flex min-w-0 items-center gap-3 font-medium hover:underline"
                      >
                        <span className="min-w-0">
                          <span className="block">
                            {projectListLabel(p)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-muted-foreground">{p.agency?.name ?? "—"}</td>
                    <td>
                      <span className="text-muted-foreground">
                        {p._count.crew}
                      </span>
                    </td>
                    {FEATURE_CALL_SHEETS_UI ? (
                      <td>
                        <span className="text-muted-foreground">
                          {p._count.callSheets}
                        </span>
                      </td>
                    ) : null}
                    <td>
                      <span className="text-muted-foreground">
                        {p.startDate ? formatDateShort(p.startDate) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              {query || customerId ? "Ingen aktive prosjekter matcher søket eller kunden." : "Ingen aktive prosjekter."}
            </p>
          )}
        </div>

        {archivedProjects.length ? (
          <details className="group border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                Arkiverte prosjekter
                <span className="ap-code text-faint">
                  {archivedProjects.length}
                </span>
              </span>
            </summary>
            <div className="ap-table-wrap border-x-0 border-b-0">
              <table className="ap-table">
                <thead>
                  <tr>{sortHeader}<th scope="col">Byrå</th><th scope="col">Crew</th><th scope="col">Start</th></tr>
                </thead>
                <tbody>
                  {archivedProjects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/projects/${p.id}`}
                          className="inline-flex min-w-0 items-center gap-3 font-medium hover:underline"
                        >
                          <span className="min-w-0">
                            <span className="block">
                              {projectListLabel(p)}
                            </span>
                          </span>
                          <Badge variant="secondary">Arkivert</Badge>
                        </Link>
                      </td>
                      <td className="text-muted-foreground">{p.agency?.name ?? "—"}</td>
                      <td>
                        <span className="text-muted-foreground">
                          {p._count.crew} crew
                        </span>
                      </td>
                      <td>
                        <span className="text-muted-foreground">
                          {p.startDate ? formatDateShort(p.startDate) : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </div>
      {!projects.length ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          Ingen prosjekter ennå.
        </p>
      ) : null}
    </>
  );
}
