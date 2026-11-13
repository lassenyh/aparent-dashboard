import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertPermission, requireProjectAccess } from "@/lib/project-access";
import { PageHeader } from "@/components/page-header";
import { PageBackLink } from "@/components/page-back-link";
import { OppgjorMailBuilderLoader } from "@/components/oppgjor/oppgjor-mail-builder-loader";
import type { OppgjorCrewOption } from "@/components/oppgjor/oppgjor-mail-builder";
import { resolveRoleForProject } from "@/lib/snapshot";
import { sortProjectCrewByDepartmentOrder } from "@/lib/crew-department-order";
import { projectListLabel } from "@/lib/project-list-presentation";
import { crewRoles, isLeadRole } from "@/lib/project-leads";

type PageProps = { params: Promise<{ id: string }> };

export default async function OppgjorPage({ params }: PageProps) {
  const { id } = await params;
  const { flags } = await requireProjectAccess(id);
  assertPermission(flags, "canViewCrew");

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      internalTitle: true,
      expensesUrl: true,
      customer: { select: { name: true } },
      crew: {
        where: { isActive: true },
        include: { person: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!project) notFound();

  /* Alle i prosjektcrewet, i avdelingsrekkefølge. Samme e-post vises bare én gang. */
  const seen = new Set<string>();
  const crew: OppgjorCrewOption[] = [];
  for (const pc of sortProjectCrewByDepartmentOrder(project.crew)) {
    const email = pc.person.email?.trim() || null;
    if (email) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const role = resolveRoleForProject(pc);
    /* Produsent og regissør trenger ikke oppgjørsmailen — med i listen, men ikke valgt. */
    const isLead = crewRoles(pc).some((r) => isLeadRole(r, "producer") || isLeadRole(r, "director"));
    crew.push({ id: pc.id, name: pc.person.fullName, role: role === "—" ? "" : role, email, defaultSelected: !isLead });
  }

  return (
    <>
      <div className="mb-6">
        <PageBackLink href={`/desk/projects/${project.id}?tab=crew`}>{projectListLabel(project)}</PageBackLink>
      </div>
      <PageHeader kicker="Mail" title="Oppgjør" />
      <OppgjorMailBuilderLoader
        projectId={project.id}
        projectLabel={[project.internalTitle?.trim(), project.customer?.name?.trim(), project.name.trim()].filter(Boolean).join(" - ")}
        expensesUrl={project.expensesUrl ?? ""}
        canEditExpensesUrl={flags.canEditProjectInfo}
        crew={crew}
      />
    </>
  );
}
