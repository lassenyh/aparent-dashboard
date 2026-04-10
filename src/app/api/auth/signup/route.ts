import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-password";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { username?: string; password?: string; fullName?: string; company?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();
  const fullName = String(body.fullName ?? "").trim() || null;
  const company = String(body.company ?? "").trim() || null;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Brukernavn og passord er påkrevd." },
      { status: 400 },
    );
  }

  if (username.length < 3) {
    return NextResponse.json(
      { error: "Brukernavn må være minst 3 tegn." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Passordet må være minst 8 tegn." },
      { status: 400 },
    );
  }

  const existing = await prisma.dashboardUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "Brukernavnet er allerede i bruk." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.dashboardUser.create({
    data: { username, passwordHash, fullName, company, isInternal: false },
  });

  return NextResponse.json({ ok: true as const }, { status: 201 });
}
