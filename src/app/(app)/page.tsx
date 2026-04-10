import Link from "next/link";
import { Plus, Users, CalendarDays, ChevronRight } from "lucide-react";
import { getProjectsList } from "@/actions/projects";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURE_CALL_SHEETS_UI } from "@/lib/feature-flags";
import { getSessionDashboardUser } from "@/lib/auth-session";
import { PublicLogoImg } from "@/components/public-logo-img";
import { formatDateShort, formatProjectDisplayName } from "@/lib/utils";

export default async function HomePage() {
  const [projects, user] = await Promise.all([
    getProjectsList(),
    getSessionDashboardUser(),
  ]);
  const isInternal = user?.isInternal ?? false;

  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status !== "active");

  return (
    <>
      <PageHeader
        title="Prosjekter"
        actions={
          isInternal ? (
            <Button asChild size="sm" className="bg-amber-500 text-black hover:bg-amber-400 font-medium shadow-none">
              <Link href="/projects/new">
                <Plus className="h-3.5 w-3.5" />
                Nytt prosjekt
              </Link>
            </Button>
          ) : null
        }
      />

      {!projects.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-muted-foreground">Ingen prosjekter ennå.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {active.length > 0 && (
            <section>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Aktive — {active.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

          {archived.length > 0 && (
            <section>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Arkivert — {archived.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

type Project = Awaited<ReturnType<typeof getProjectsList>>[number];

function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group relative flex flex-col rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-white/10 hover:bg-white/[0.03]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {p.customer?.logoUrl ? (
            <div className="flex h-8 w-16 shrink-0 items-center">
              <PublicLogoImg
                src={p.customer.logoUrl}
                alt=""
                className="h-full w-full object-contain object-left brightness-0 invert opacity-70"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-bold text-zinc-400">
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <Badge
          variant={p.status === "active" ? "success" : "secondary"}
          className={
            p.status === "active"
              ? "border-transparent bg-emerald-500/10 text-emerald-400"
              : "border-transparent bg-white/5 text-zinc-500"
          }
        >
          {p.status === "active" ? "Aktiv" : "Arkivert"}
        </Badge>
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-foreground leading-snug">
          {formatProjectDisplayName(p)}
        </p>
        {p.customer?.name && !p.customer?.logoUrl ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{p.customer.name}</p>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1.5 text-[12px] text-zinc-500">
          <Users className="h-3 w-3" />
          {p._count.crew} crew
        </span>
        {FEATURE_CALL_SHEETS_UI && (
          <span className="text-[12px] text-zinc-500">
            {p._count.callSheets} call sheets
          </span>
        )}
        {p.startDate ? (
          <span className="ml-auto flex items-center gap-1 text-[12px] text-zinc-500">
            <CalendarDays className="h-3 w-3" />
            {formatDateShort(p.startDate)}
          </span>
        ) : null}
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-700 transition-colors group-hover:text-zinc-400" />
      </div>
    </Link>
  );
}
