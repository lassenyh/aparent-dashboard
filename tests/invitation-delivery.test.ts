import assert from "node:assert/strict";
import test from "node:test";
import { deliverInvitation } from "../src/lib/invitations/delivery";

test("Resend request contains correct recipient and idempotency; failures are not success", async () => {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_test_not_real";
  process.env.RESEND_FROM_EMAIL = "WrapUp Desk <invitasjon@example.invalid>";
  const input = { id: "test-invite", tokenHash: "test-hash", email: "recipient@example.invalid", project: "Only this project", inviter: "Test admin", message: "Welcome", url: "https://example.invalid/invitasjon/test", permissions: { crew: "read", dagsplan: "none", callSheets: "none", payroll: "none" } as const };
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.resend.com/emails");
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.to, [input.email]);
      assert.equal(body.from, process.env.RESEND_FROM_EMAIL);
      assert.ok(!body.text.includes("Lønningslister:"));
      assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "project-invite/test-invite/test-hash");
      return Response.json({ id: "provider-message-id" });
    };
    assert.equal(await deliverInvitation(input), "provider-message-id");
    globalThis.fetch = async () => Response.json({ error: "private provider data" }, { status: 403 });
    await assert.rejects(deliverInvitation(input), /E-posten kunne ikke sendes/);
    globalThis.fetch = async () => { throw new Error("network timeout"); };
    await assert.rejects(deliverInvitation(input), /network timeout/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = previousFrom;
  }
});
