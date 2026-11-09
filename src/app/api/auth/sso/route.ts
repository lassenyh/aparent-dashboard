import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { prisma } from "@/lib/db";
import { createDashboardSession, sessionCookieOptions } from "@/lib/auth-session";
import { safeLoginRedirect } from "@/lib/login-redirect";
import { supabaseSessionClient } from "@/lib/supabase/session";

export const runtime = "nodejs";

/**
 * Felles innlogging på samme domene: brukeren har en gyldig WrapUp-økt
 * (Supabase-cookie, f.eks. fra Planner under /planner), men ingen Desk-økt.
 * Verifiserer økten mot Supabase, finner koblet Desk-bruker og oppretter
 * Desk-økt. Ellers videre til innlogging.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeLoginRedirect(url.searchParams.get("next"));
  const toLogin = () => {
    const login = new URL("/login", url);
    if (next !== "/") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  };

  try {
    const supabase = await supabaseSessionClient();
    // getUser verifiserer mot Auth-serveren; stoler ikke på cookie-innholdet alene.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email_confirmed_at) return toLogin();
    const user = await prisma.dashboardUser.findUnique({ where: { supabaseAuthId: data.user.id } });
    if (!user?.isActive) return toLogin();

    const token = await createDashboardSession(user.id);
    const response = NextResponse.redirect(new URL(next, url));
    response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return toLogin();
  }
}
