import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { prisma } from "@/lib/db";
import { supabaseSessionClient } from "@/lib/supabase/session";
import { createDashboardSession, sessionCookieOptions } from "@/lib/auth-session";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

/**
 * Innlogging med felles WrapUp-konto (Supabase Auth, samme prosjekt som Sign og
 * Planner). Brukernavn slås opp til e-posten på Desk-brukeren. Kontoen må være
 * koblet til en aktiv Desk-bruker via `supabaseAuthId`; det kobles aldri
 * automatisk på e-post (se scripts/relink-supabase-auth.ts).
 */
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

  let email = username.includes("@") ? username.toLowerCase() : null;
  if (!email) {
    const byUsername = await prisma.dashboardUser.findUnique({ where: { username }, select: { email: true } });
    email = byUsername?.email?.trim().toLowerCase() || null;
  }
  if (!email) return fail();

  /* Setter også Supabase-øktcookien, så Planner på samme domene deler innloggingen. */
  const supabase = await supabaseSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email_confirmed_at) {
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    return fail();
  }

  const linked = await prisma.dashboardUser.findUnique({ where: { supabaseAuthId: data.user.id } });
  if (!linked?.isActive) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { error: "Kontoen finnes, men har ikke tilgang til WrapUp Desk. Kontakt administrator." },
      { status: 403 },
    );
  }

  const token = await createDashboardSession(linked.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
