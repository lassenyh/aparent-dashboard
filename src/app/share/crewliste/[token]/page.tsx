import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProjectCrewListPageData,
  getProjectIdByCrewListShareToken,
} from "@/actions/project-crew-list";
import { toCrewListSharePayload } from "@/lib/crew-list-share-payload";
import { CrewListShareLive } from "@/components/crew/crew-list-share-live";

type PageProps = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crewliste (delt)",
  robots: { index: false, follow: false },
};

export default async function CrewListSharePage({ params }: PageProps) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const projectId = await getProjectIdByCrewListShareToken(token);
  if (!projectId) notFound();

  const data = await getProjectCrewListPageData(projectId);
  if (!data) notFound();

  const initial = toCrewListSharePayload(data);

  return <CrewListShareLive initial={initial} />;
}
