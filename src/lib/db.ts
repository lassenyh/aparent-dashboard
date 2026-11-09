import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Bump når genererte Prisma-felt endres, så `next dev` ikke beholder en
 * gammel global klient over HMR («Unknown argument …»).
 */
const PRISMA_CLIENT_EPOCH = "prisma7-v1";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaEpoch?: string;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaEpoch === PRISMA_CLIENT_EPOCH
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaEpoch = PRISMA_CLIENT_EPOCH;
}
