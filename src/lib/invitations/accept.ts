import type { PrismaClient } from "@prisma/client";
import { membershipPermissions } from "./permissions";

/** Atomically consume an invitation and grant exactly its stored project permissions. */
export async function acceptProjectInvitation(db: PrismaClient, input: {
  tokenHash: string; userId: string; email: string;
}) {
  return db.$transaction(async tx => {
    const claimed = await tx.projectInvitation.updateMany({
      where: { tokenHash: input.tokenHash, email: input.email, status: "sent", expiresAt: { gt: new Date() } },
      data: { status: "accepted", acceptedAt: new Date(), acceptedUserId: input.userId },
    });
    if (!claimed.count) return false;
    const invite = await tx.projectInvitation.findUniqueOrThrow({ where: { tokenHash: input.tokenHash } });
    const user = await tx.dashboardUser.findUnique({ where: { id: input.userId } });
    if (!user?.isActive || user.email?.toLowerCase() !== invite.email) throw new Error("Invitation identity mismatch");
    await tx.projectMembership.upsert({
      where: { userId_projectId: { userId: user.id, projectId: invite.projectId } },
      create: { userId: user.id, projectId: invite.projectId, ...membershipPermissions(invite.permissions) },
      // Do not overwrite access granted separately while the invitation was pending.
      update: {},
    });
    return true;
  });
}
