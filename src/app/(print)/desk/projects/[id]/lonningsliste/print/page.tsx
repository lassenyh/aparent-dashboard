import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Gammel URL uten listId — videresend til nyeste liste eller oversikt. */
export default async function LegacyPayrollPrintRedirect({ params }: PageProps) {
  const { id } = await params;
  const first = await prisma.payrollList.findFirst({
    where: { projectId: id },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (first) {
    redirect(`/desk/projects/${id}/lonningsliste/${first.id}/print`);
  }
  redirect(`/desk/projects/${id}/lonningsliste`);
}
