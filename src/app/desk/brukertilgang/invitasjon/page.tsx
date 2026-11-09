import { redirect } from "next/navigation";

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  redirect(projectId ? `/desk/brukertilgang?projectId=${encodeURIComponent(projectId)}` : "/desk/brukertilgang");
}
