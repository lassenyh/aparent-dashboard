import "server-only";
import { prisma } from "@/lib/db";
import { hashAuthToken } from "@/lib/auth-token";

/** Fixed windows shared between all Vercel instances; identifiers are hashed. */
export async function allowAuthAttempt(identifier: string, limit = 15) {
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const key = hashAuthToken(`${identifier}:${window}`);
  const row = await prisma.authRateLimit.upsert({
    where: { key }, create: { key, expiresAt: new Date((window + 1) * windowMs) },
    update: { attempts: { increment: 1 } },
  });
  return row.attempts <= limit;
}
