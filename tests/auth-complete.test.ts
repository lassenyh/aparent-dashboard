import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = { exports: {} } as NodeModule;

test("native invite verifies identity before password changes and preserves local permissions", async (t) => {
  const prisma = {
    dashboardUser: { findUnique: async () => null },
    authRateLimit: { upsert: async () => ({ attempts: 1 }) },
    dashboardSession: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
  };
  require.cache[require.resolve("../src/lib/db")] = { exports: { prisma } } as NodeModule;
  const { POST } = await import("../src/app/api/auth/complete/route");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  const user = { id: "verified-auth-id", email: "person@example.test", email_confirmed_at: new Date().toISOString() };
  let verified = true;
  let active = true;
  let linked = true;
  let changes = 0;
  let sessions = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    if (init?.method === "PUT") { changes++; return Response.json(user); }
    return verified ? Response.json(user) : Response.json({ message: "Invalid token" }, { status: 401 });
  });
  t.mock.method(prisma.dashboardUser, "findUnique", async (args: { where: { supabaseAuthId: string } }) => {
    assert.equal(args.where.supabaseAuthId, user.id);
    return linked ? { id: "local-id", isActive: active } : null;
  });
  t.mock.method(prisma.authRateLimit, "upsert", async () => ({ attempts: 1 }));
  t.mock.method(prisma.dashboardSession, "deleteMany", async () => ({ count: 1 }));
  t.mock.method(prisma.dashboardSession, "create", async () => { sessions++; return {}; });
  const encoded = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const token = `e30.${encoded}.fake`;
  const request = (origin = "https://wrapup.test") => new Request("https://wrapup.test/api/auth/complete", {
    method: "POST", headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, refresh_token: "fake", password: "Test-only-password-123" }),
  });
  assert.equal((await POST(request("https://other.test"))).status, 403);
  verified = false;
  assert.equal((await POST(request())).status, 401);
  assert.equal(changes, 0);
  verified = true; linked = false;
  assert.equal((await POST(request())).status, 403);
  linked = true; active = false;
  assert.equal((await POST(request())).status, 403);
  assert.equal(changes, 0);
  active = true;
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
  assert.equal(changes, 1);
  assert.equal(sessions, 1);
});
