import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAuthClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { createDashboardSession, sessionCookieOptions } from "@/lib/auth-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

const input = z.object({
  access_token: z.string().min(1).max(16384),
  refresh_token: z.string().min(1).max(4096),
  password: z.string().min(8).max(128),
});
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Ugyldig forespørsel.", 403);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Velg et passord på 8–128 tegn.");
  try {
    const auth = supabaseAuthClient().auth;
    const session = await auth.setSession(parsed.data);
    if (session.error) return fail("Lenken er utløpt eller ugyldig. Be om en ny passordlenke.", 401);
    // Always verify with the Auth server; never trust decoded JWT/email metadata.
    const verified = await auth.getUser();
    if (verified.error || !verified.data.user?.email_confirmed_at) return fail("Kunne ikke bekrefte invitasjonen.", 401);
    const user = await prisma.dashboardUser.findUnique({ where: { supabaseAuthId: verified.data.user.id } });
    if (!user?.isActive) return fail("Denne brukeren har ikke aktiv tilgang til WrapUp. Be administrator invitere deg fra Brukertilgang i WrapUp.", 403);
    if (!await allowAuthAttempt(`complete:${user.id}`)) return fail("For mange forsøk. Prøv igjen senere.", 429);
    const updated = await auth.updateUser({ password: parsed.data.password });
    if (updated.error) return fail("Passordet kunne ikke lagres. Velg et annet passord, eller be om en ny passordlenke.");
    // Password recovery also invalidates previous WrapUp sessions.
    await prisma.dashboardSession.deleteMany({ where: { userId: user.id } });
    const token = await createDashboardSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return fail("Kunne ikke fullføre registreringen. Prøv igjen senere.", 503); }
}
