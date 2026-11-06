import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { prisma } from "@/lib/db";
import { validateLogin } from "@/lib/supabase/auth";
import { supabaseAuthClient } from "@/lib/supabase/admin";
import { createDashboardSession, sessionCookieOptions } from "@/lib/auth-session";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 403 });
  }
  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const fail = () => NextResponse.json({ error: "Feil brukernavn, e-post eller passord." }, { status: 401 });
  if (!username || username.length > 254 || !password || password.length > 1024) return fail();
  if (!await allowAuthAttempt(`login:${username.toLowerCase()}`)) {
    return NextResponse.json({ error: "For mange forsøk. Prøv igjen om 15 minutter." }, { status: 429 });
  }
  let sessionUserId: string | null = null;
  const candidates = await prisma.dashboardUser.findMany({ where: { OR: [{ username }, ...(username.includes("@") ? [{ email: { equals: username, mode: "insensitive" as const } }] : [])] }, take: 2 });
  if (candidates.length > 1) return fail();
  const dbUser = candidates[0];
  if (dbUser && !dbUser.isActive) return fail();

  if (dbUser && !dbUser.supabaseAuthId && await verifyPassword(password.trim(), dbUser.passwordHash)) {
    sessionUserId = dbUser.id;
  } else if (username.includes("@")) {
    const { data, error } = await supabaseAuthClient().auth.signInWithPassword({ email: username.toLowerCase(), password });
    if (!error && data.user?.email_confirmed_at) {
      const linked = await prisma.dashboardUser.findUnique({ where: { supabaseAuthId: data.user.id } });
      if (linked?.isActive) sessionUserId = linked.id;
    }
  } else if (!dbUser?.supabaseAuthId) {
    // Migration path for existing legacy accounts, never for new invited accounts.
    const legacy = await validateLogin(username, password.trim());
    if (legacy) {
      const existing = await prisma.dashboardUser.findFirst({ where: { OR: [
        { legacySupabaseLoginId: legacy.id }, { username: legacy.username },
      ] } });
      if (existing && (!existing.isActive || existing.supabaseAuthId)) return fail();
      const passwordHash = await hashPassword(password.trim());
      if (existing) {
        const updated = await prisma.dashboardUser.update({ where: { id: existing.id }, data: {
          passwordHash, legacySupabaseLoginId: legacy.id,
          fullName: existing.fullName ?? legacy.full_name,
          company: existing.company ?? legacy.company,
          // Existing permissions must never be elevated by a legacy fallback.
        } });
        sessionUserId = updated.id;
      } else {
        const created = await prisma.dashboardUser.create({ data: {
          username: legacy.username, passwordHash, fullName: legacy.full_name,
          company: legacy.company, legacySupabaseLoginId: legacy.id, isInternal: true,
        } });
        sessionUserId = created.id;
      }
    }
  }
  if (!sessionUserId) return fail();
  const token = await createDashboardSession(sessionUserId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
