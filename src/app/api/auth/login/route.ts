import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { validateLogin } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Feil brukernavn eller passord." },
      { status: 400 },
    );
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "").trim();

  if (!username || !password) {
    return NextResponse.json(
      { error: "Feil brukernavn eller passord." },
      { status: 401 },
    );
  }

  const user = await validateLogin(username, password);
  if (!user) {
    return NextResponse.json(
      { error: "Feil brukernavn eller passord." },
      { status: 401 },
    );
  }

  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(AUTH_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
  });
  return res;
}
