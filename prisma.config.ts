import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7: CLI-oppsett (migreringer, seed). Migreringer må gå direkte til
 * Postgres — Neons pooler støtter ikke pg_advisory_lock. Bruker DIRECT_URL når
 * den er satt, ellers DATABASE_URL uten «-pooler». Appen selv bruker pooled
 * DATABASE_URL via adapteren i src/lib/db.ts.
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
function migrationUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const pooled = env("DATABASE_URL");
  try {
    const url = new URL(pooled);
    if (url.hostname.endsWith(".neon.tech")) {
      url.hostname = url.hostname.replace("-pooler.", ".");
      return url.toString();
    }
  } catch {
    // Ikke en URL — la Prisma rapportere feilen.
  }
  return pooled;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl(),
  },
});
