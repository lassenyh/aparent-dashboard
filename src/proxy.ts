import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

/** Supabase-øktcookie (felles WrapUp-innlogging), uten å verifisere den her. */
function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

function isPublicAsset(pathname: string): boolean {
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt)$/i.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/favicon.ico" ||
    isPublicAsset(pathname)
  ) {
    return NextResponse.next();
  }

  /** Ikke redirect /login → / kun fordi cookie finnes (kan være utdatert/ugyldig id). Gyldig sesjon sjekkes i `app/login/page.tsx`. */
  if (pathname.startsWith("/login") || pathname === "/auth/complete" || pathname === "/api/auth/complete") {
    return NextResponse.next();
  }

  /** Planner er en egen app, proxyet hit via rewrite i next.config.ts. Den har egen innlogging. */
  if (pathname === "/planner" || pathname.startsWith("/planner/")) {
    return NextResponse.next();
  }

  if (pathname === "/api/auth/sso") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/share/") || pathname.startsWith("/invitasjon/")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/api/auth/recover"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/share/")) {
    return NextResponse.next();
  }

  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) {
    return NextResponse.next();
  }

  /**
   * Same-origin proxy for Vercel Blob-logoer (kun tillatte hosts i route).
   * Må være offentlig: ellers redirect til /login gir HTML i <img> og Safari-feil.
   */
  if (pathname === "/api/public-image" || pathname.startsWith("/api/public-image/")) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!session && hasSupabaseSessionCookie(request) && request.method === "GET" && !pathname.startsWith("/api/")) {
    /* Innlogget i en annen WrapUp-tjeneste på samme domene: prøv felles innlogging først. */
    const sso = new URL("/api/auth/sso", request.url);
    sso.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(sso);
  }
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    const next = pathname + request.nextUrl.search;
    if (next && next !== "/") {
      loginUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
