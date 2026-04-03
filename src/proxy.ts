import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

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
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/share/")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/share/")) {
    return NextResponse.next();
  }

  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
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
