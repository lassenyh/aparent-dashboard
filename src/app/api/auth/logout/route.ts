import { deleteDashboardSession } from "@/lib/auth-session";
import { supabaseSessionClient } from "@/lib/supabase/session";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 403 });
  await deleteDashboardSession();
  /* Felles WrapUp-økt: logger også ut av Planner på samme domene. */
  try {
    await (await supabaseSessionClient()).auth.signOut({ scope: "local" });
  } catch {
    // Mangler Supabase-oppsett eller økt — Desk-økten er uansett slettet.
  }
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 0,
  });
  return res;
}
