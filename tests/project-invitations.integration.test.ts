import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { acceptProjectInvitation } from "../src/lib/invitations/accept";

// Explicit opt-in: temporary, isolated records are always removed in finally.
test("database: invitations are single-use, scoped, expiring, revocable and identity-bound", { skip: process.env.RUN_INVITATION_DB_TESTS !== "1" }, async () => {
  const db = new PrismaClient();
  const suffix = randomUUID();
  const email = `invitation-test-${suffix}@example.invalid`;
  const permissions = { crew: "read", dagsplan: "read", callSheets: "none", payroll: "none" } as const;
  let userId: string | undefined;
  const projectIds: string[] = [];
  try {
    const user = await db.dashboardUser.create({ data: { username: email, email, passwordHash: "invalid-test-only", isInternal: false } });
    userId = user.id;
    for (const name of ["invited", "other"]) projectIds.push((await db.project.create({ data: { name: `INVITATION TEST ${suffix} ${name}` } })).id);
    const tokenHash = randomUUID();
    const invite = await db.projectInvitation.create({ data: { email, projectId: projectIds[0], inviterName: "Test", invitedById: user.id, permissions, tokenHash, status: "sent", expiresAt: new Date(Date.now() + 60000) } });
    const input = { tokenHash, email, userId: user.id };
    assert.equal(await acceptProjectInvitation(db, { ...input, email: "wrong@example.invalid" }), false);
    const results = await Promise.all([acceptProjectInvitation(db, input), acceptProjectInvitation(db, input)]);
    assert.equal(results.filter(Boolean).length, 1);
    const memberships = await db.projectMembership.findMany({ where: { userId: user.id } });
    assert.equal(memberships.length, 1);
    assert.equal(memberships[0].projectId, projectIds[0]);
    assert.equal(memberships[0].canViewCrew, true);
    assert.equal(memberships[0].canEditCrew, false);
    assert.equal(memberships[0].canViewPayroll, false);
    assert.equal((await db.dashboardUser.findUniqueOrThrow({ where: { id: user.id } })).isInternal, false);
    await db.projectMembership.deleteMany({ where: { userId: user.id } });
    await db.projectInvitation.update({ where: { id: invite.id }, data: { status: "revoked" } });
    assert.equal(await acceptProjectInvitation(db, input), false);
    await db.projectInvitation.update({ where: { id: invite.id }, data: { status: "sent", expiresAt: new Date(Date.now() - 1000) } });
    assert.equal(await acceptProjectInvitation(db, input), false);
    await db.projectInvitation.update({ where: { id: invite.id }, data: { status: "sent", expiresAt: new Date(Date.now() + 60000) } });
    await db.dashboardUser.update({ where: { id: user.id }, data: { isActive: false } });
    await assert.rejects(acceptProjectInvitation(db, input), /identity mismatch/);
    assert.equal((await db.projectInvitation.findUniqueOrThrow({ where: { id: invite.id } })).status, "sent");
    assert.equal(await db.projectMembership.count({ where: { userId: user.id } }), 0);
  } finally {
    await db.project.deleteMany({ where: { id: { in: projectIds } } });
    if (userId) await db.dashboardUser.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
