import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Offentlig helsesjekk (uten innlogging) for feilsøking på Vercel.
 * Åpne /api/health i nettleseren — viser om DB og nødvendige env er på plass.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasDirectUrl = Boolean(process.env.DIRECT_URL?.trim());
  const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY?.trim());

  if (!hasDatabaseUrl || !hasDirectUrl) {
    return Response.json(
      {
        ok: false,
        error: "database_env",
        hasDatabaseUrl,
        hasDirectUrl,
        hasEncryptionKey,
        hint:
          "Sett DATABASE_URL og DIRECT_URL i Vercel (samme som lokalt .env). Prisma krever begge.",
      },
      { status: 503 },
    );
  }

  if (!hasEncryptionKey) {
    return Response.json(
      {
        ok: false,
        error: "encryption_env",
        hasDatabaseUrl,
        hasDirectUrl,
        hasEncryptionKey,
        hint: "Sett ENCRYPTION_KEY i Vercel (samme verdi som lokalt).",
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      database: "connected",
      hasDatabaseUrl,
      hasDirectUrl,
      hasEncryptionKey,
    });
  } catch (e) {
    console.error("[health] database check failed:", e);
    return Response.json(
      {
        ok: false,
        error: "database_query",
        hasDatabaseUrl,
        hasDirectUrl,
        hasEncryptionKey,
        hint:
          "DATABASE_URL/DIRECT_URL er satt, men tilkobling feilet. Sjekk Neon (dvale, passord, SSL).",
      },
      { status: 503 },
    );
  }
}
