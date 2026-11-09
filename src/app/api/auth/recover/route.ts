import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { supabaseAuthClient } from "@/lib/supabase/admin";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

const input = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const ok = () =>
  NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

/**
 * «Glemt passord»: sender lenke for nytt passord til en aktiv Desk-bruker med
 * koblet WrapUp-konto. Svarer alltid likt, så adresser ikke kan prøves ut.
 */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
  const { email } = parsed.data;
  if (!await allowAuthAttempt(`recover:${email}`)) {
    return NextResponse.json({ error: "For mange forsøk. Prøv igjen om 15 minutter." }, { status: 429 });
  }
  const user = await prisma.dashboardUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true, supabaseAuthId: { not: null } },
    select: { id: true },
  });
  if (user) {
    const redirectTo = new URL("/auth/complete", request.url).toString();
    const { error } = await supabaseAuthClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) console.error("Password recovery failed", { status: error.status });
  }
  return ok();
}
