import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

/** Crewlisten vises nå som popup i Crew-fanen. Gamle lenker sendes dit. */
export default async function ProjectCrewListPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/desk/projects/${id}?tab=crew`);
}
