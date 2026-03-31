import { Prisma, PrismaClient } from "@prisma/client";

/** Etter strukturert adresse på PayrollRow — gammel generert klient mangler felt og gir «Unknown argument addressLine». */
const PAYROLL_ROW_HAS_STRUCTURED_ADDRESS =
  "addressLine" in Prisma.PayrollRowScalarFieldEnum;

if (!PAYROLL_ROW_HAS_STRUCTURED_ADDRESS) {
  throw new Error(
    "[Prisma] Generert klient matcher ikke schema (mangler PayrollRow.addressLine). Kjør: npx prisma generate — deretter slett .next og start next dev på nytt.",
  );
}

/** Etter durationMinutes på timeplan-rader — gammel klient gir «Unknown argument durationMinutes». */
const SCHEDULE_ENTRY_HAS_DURATION =
  "durationMinutes" in Prisma.DagsplanScheduleEntryScalarFieldEnum;

if (!SCHEDULE_ENTRY_HAS_DURATION) {
  throw new Error(
    "[Prisma] Generert klient matcher ikke schema (mangler DagsplanScheduleEntry.durationMinutes). Kjør: npx prisma generate — deretter slett .next og start next dev på nytt.",
  );
}

type GlobalPrisma = typeof globalThis & {
  prisma?: PrismaClient;
  /** Én gang i dev: bytt ut gammel singleton etter `prisma generate` uten omstart. */
  __prismaPayrollReloaded?: boolean;
};

const globalForPrisma = globalThis as GlobalPrisma;

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  const c = globalForPrisma.prisma as { payrollList?: { upsert: unknown } };
  const hasPayroll =
    typeof c.payrollList?.upsert === "function";

  if (
    process.env.NODE_ENV !== "production" &&
    !hasPayroll &&
    !globalForPrisma.__prismaPayrollReloaded
  ) {
    globalForPrisma.__prismaPayrollReloaded = true;
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = getPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
