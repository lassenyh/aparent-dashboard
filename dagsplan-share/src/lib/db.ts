/**
 * Adapted from dashboard `src/lib/db.ts`.
 * Payroll-client version guards from the full app were removed; only the
 * Dagsplan schedule durationMinutes guard remains.
 */
import { Prisma, PrismaClient } from "@prisma/client";

/** After durationMinutes on schedule rows — old client gives «Unknown argument durationMinutes». */
const SCHEDULE_ENTRY_HAS_DURATION =
  "durationMinutes" in Prisma.DagsplanScheduleEntryScalarFieldEnum;

if (!SCHEDULE_ENTRY_HAS_DURATION) {
  throw new Error(
    "[Prisma] Generert klient matcher ikke schema (mangler DagsplanScheduleEntry.durationMinutes). Kjør: npx prisma generate — deretter slett .next og start next dev på nytt.",
  );
}

type GlobalPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
