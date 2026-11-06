import assert from "node:assert/strict";
import test from "node:test";
import { membershipPermissions } from "../src/lib/invitations/permissions";
import { invitationEmail } from "../src/lib/invitations/email";
import { hashAuthToken, newAuthToken, validAuthToken } from "../src/lib/auth-token";

test("invitation permissions cannot grant admin, sensitive data or database import", () => {
  const p = membershipPermissions({ crew: "write", dagsplan: "none", callSheets: "read", payroll: "none", isInternal: true, canManageMemberships: true, canViewSensitiveData: true });
  assert.equal(p.role, "editor");
  assert.equal(p.canEditCrew, true);
  assert.equal(p.canViewCrew, true);
  assert.equal(p.canViewDagsplan, false);
  assert.equal(p.canEditCallSheets, false);
  assert.equal(p.canViewPayroll, false);
  assert.equal(p.canViewSensitiveData, false);
  assert.equal(p.canImportCrewDatabase, false);
  assert.equal("isInternal" in p, false);
  assert.throws(() => membershipPermissions({ crew: "admin" }));
});

test("read-only invitation grants no writes", () => {
  const p = membershipPermissions({ crew: "read", dagsplan: "read", callSheets: "read", payroll: "read" });
  assert.equal(p.role, "viewer");
  assert.ok(Object.entries(p).filter(([key]) => key.startsWith("canEdit")).every(([, value]) => value === false));
});

test("email escapes user text and omits permission details", () => {
  const email = invitationEmail({ project: '<script>alert(1)</script>', inviter: 'A & B', message: '<img src=x onerror=alert(1)>', url: 'https://example.com/invitasjon/abc', permissions: { crew: "read", dagsplan: "write", callSheets: "none", payroll: "none" } });
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<img src=x'));
  assert.ok(email.html.includes('https://example.com/Favicon/icon-48.png'));
  assert.ok(email.html.includes('A &amp; B'));
  assert.ok(!email.text.includes('Dagsplaner:'));
  assert.ok(!email.text.includes('Lønningslister:'));
  assert.ok(!email.html.includes('DIN TILGANG'));
  assert.ok(!email.html.includes('Du er invitert med.'));
});

test("tokens have 256 random bits; raw IDs and malformed tokens are rejected", () => {
  const a = newAuthToken(), b = newAuthToken();
  assert.equal(a.length, 64);
  assert.notEqual(a, b);
  assert.equal(validAuthToken(a), true);
  assert.notEqual(hashAuthToken(a), a);
  for (const value of ['cmnis8nir0000352s806pkrxa', '', 'a'.repeat(63), 'g'.repeat(64)]) assert.equal(validAuthToken(value), false);
});

 test("project info editing is explicit and old invitations remain read-only", () => {
  const base = { crew: "none", dagsplan: "none", callSheets: "none", payroll: "none" };
  assert.equal(membershipPermissions(base).canEditProjectInfo, false);
  const flags = membershipPermissions({ ...base, projectInfo: "write" });
  assert.equal(flags.canEditProjectInfo, true);
  assert.equal(flags.canViewProjectInfo, true);
  assert.equal(flags.canEditCrew, false);
  assert.equal(flags.canViewSensitiveData, false);
  assert.throws(() => membershipPermissions({ ...base, projectInfo: "admin" }));
});
