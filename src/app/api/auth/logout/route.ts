import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export const runtime = "nodejs";

export async function POST() {
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
