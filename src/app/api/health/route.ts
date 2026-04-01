import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Økes når health-JSON får nye felt — bruk for å se om Vercel faktisk kjører siste deploy. */
const HEALTH_PAYLOAD_VERSION = 2;

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

  /** Bekrefter at migrert skjema matcher Prisma-klienten (fanger «Unknown column» e.l.). */
  try {
    await prisma.person.findFirst({
      select: { id: true, dietaryPreference: true },
    });
  } catch (e) {
    console.error("[health] prisma schema / Person query failed:", e);
    return Response.json(
      {
        ok: false,
        error: "prisma_schema",
        hasDatabaseUrl,
        hasDirectUrl,
        hasEncryptionKey,
        hint:
          "Databasen er tilkoblet, men spørring mot Person feilet. Kjør migrasjoner mot produksjon: npx prisma migrate deploy (eller sjekk at deploy kjører migrate).",
      },
      { status: 503 },
    );
  }

  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  // Én søkbar linje i Vercel → Logs → Runtime (ikke Build): bekrefter at denne funksjonen kjørte.
  console.log(
    `APARENT_HEALTH_OK deployment=${deploymentId ?? "local"} healthPayloadVersion=${HEALTH_PAYLOAD_VERSION}`,
  );

  return Response.json({
    ok: true,
    database: "connected",
    prismaSchema: "ok",
    healthPayloadVersion: HEALTH_PAYLOAD_VERSION,
    /** Siste deploy på Vercel — null lokalt. Mangler du prismaSchema/healthPayloadVersion, er ikke siste kode ute. */
    vercelDeploymentId: deploymentId,
    vercelGitCommitSha: gitSha,
    hasDatabaseUrl,
    hasDirectUrl,
    hasEncryptionKey,
  });
}
