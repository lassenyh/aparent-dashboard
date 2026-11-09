import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertPermission, requireProjectAccess } from "@/lib/project-access";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { BefaringMailBuilderLoader } from "@/components/befaring/befaring-mail-builder-loader";
import { resolveRoleForProject } from "@/lib/snapshot";
import { buildGoogleMapsSearchUrl } from "@/lib/google-maps-url";
import {
  befaringRoleRank,
  matchBefaringRole,
  type BefaringCrewOption,
  type BefaringLocationOption,
} from "@/lib/befaring-mail";
import { projectListLabel } from "@/lib/project-list-presentation";

type PageProps = { params: Promise<{ id: string }> };

function osloIsoDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default async function BefaringPage({ params }: PageProps) {
  const { id } = await params;
  const { flags } = await requireProjectAccess(id);
  assertPermission(flags, "canViewCrew");

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      internalTitle: true,
      customer: { select: { name: true } },
      crew: {
        where: { isActive: true },
        include: { person: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      dagsplaner: {
        where: flags.canViewDagsplan ? undefined : { id: { in: [] } },
        orderBy: [{ shootDate: "asc" }, { createdAt: "asc" }],
        select: {
          title: true,
          shootDate: true,
          locations: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, locationName: true, locationText: true, locationMapsUrl: true },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const today = osloIsoDate();

  /* Crew → mottakere. Alle med e-post er med i listen; rollematch styrer standardvalg. */
  const crew: BefaringCrewOption[] = project.crew
    .map((pc) => {
      const role = resolveRoleForProject(pc);
      const rule = matchBefaringRole(role);
      return {
        id: pc.id,
        name: pc.person.fullName,
        role: role === "—" ? "" : role,
        email: pc.person.email?.trim() || null,
        ruleKey: rule?.key ?? "",
        ruleLabel: rule?.label ?? "",
        group: rule?.group ?? "optional",
        matched: !!rule,
      } satisfies BefaringCrewOption;
    })
    .sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return befaringRoleRank(a.ruleKey) - befaringRoleRank(b.ruleKey);
    });

  /* Lokasjoner fra dagsplaner, uten duplikater. Kommende dagsplaner er forhåndsvalgt. */
  const seen = new Set<string>();
  const locations: BefaringLocationOption[] = [];
  const hasUpcoming = project.dagsplaner.some((dp) => dp.shootDate.toISOString().slice(0, 10) >= today);
  for (const dp of project.dagsplaner) {
    const upcoming = dp.shootDate.toISOString().slice(0, 10) >= today;
    for (const loc of dp.locations) {
      const name = loc.locationName?.trim() ?? "";
      const address = loc.locationText?.trim() ?? "";
      if (!name && !address) continue;
      const key = (address || name).toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      locations.push({
        id: loc.id,
        name,
        address,
        mapsUrl: loc.locationMapsUrl?.trim() || buildGoogleMapsSearchUrl(address || name),
        source: dp.title,
        defaultIncluded: hasUpcoming ? upcoming : true,
      });
    }
  }

  const projectLabel = [project.customer?.name?.trim(), project.name.trim()].filter(Boolean).join(" - ");

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/desk/projects/${project.id}?tab=crew`}>{projectListLabel(project)}</PageBackLink>
      </div>
      <PageHeader
        kicker="Mail"
        title="Teknisk befaring"
      />
      <BefaringMailBuilderLoader
        projectId={project.id}
        projectLabel={projectLabel}
        today={today}
        defaultDate={osloIsoDate(1)}
        crew={crew}
        locations={locations}
        canSearchPlaces={flags.canEditDagsplan}
      />
    </>
  );
}
