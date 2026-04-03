import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { prisma } from "@/lib/db";
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

  let sessionUserId: string | null = null;

  const dbUser = await prisma.dashboardUser.findUnique({
    where: { username },
  });

  if (dbUser?.isActive && (await verifyPassword(password, dbUser.passwordHash))) {
    sessionUserId = dbUser.id;
  } else {
    const legacy = await validateLogin(username, password);
    if (legacy) {
      const hash = await hashPassword(password);
      const existing = await prisma.dashboardUser.findFirst({
        where: {
          OR: [
            { legacySupabaseLoginId: legacy.id },
            { username: legacy.username },
          ],
        },
      });

      if (existing) {
        const updated = await prisma.dashboardUser.update({
          where: { id: existing.id },
          data: {
            passwordHash: hash,
            legacySupabaseLoginId: legacy.id,
            fullName: existing.fullName ?? legacy.full_name,
            company: existing.company ?? legacy.company,
            /** Eksisterende Supabase-innlogginger beholder full tilgang til dashboard. */
            isInternal: true,
          },
        });
        sessionUserId = updated.id;
      } else {
        const created = await prisma.dashboardUser.create({
          data: {
            username: legacy.username,
            passwordHash: hash,
            fullName: legacy.full_name,
            company: legacy.company,
            legacySupabaseLoginId: legacy.id,
            isInternal: true,
          },
        });
        sessionUserId = created.id;
      }
    }
  }

  if (!sessionUserId) {
    return NextResponse.json(
      { error: "Feil brukernavn eller passord." },
      { status: 401 },
    );
  }

  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(AUTH_COOKIE_NAME, sessionUserId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
  });
  return res;
}
