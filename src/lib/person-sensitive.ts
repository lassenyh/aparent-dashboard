import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

/**
 * Server-only: hent personnummer og kontonummer i klartekst for lønningsliste,
 * eksport (PDF/CSV) og andre server-operasjoner.
 * Kall kun i server actions / route handlers / server components som ikke sender dette til klienten.
 */
export async function getPersonSensitivePlainForServerUse(personId: string): Promise<{
  bankAccount: string | null;
  nationalId: string | null;
}> {
  const p = await prisma.person.findUnique({
    where: { id: personId },
    select: { bankAccountEncrypted: true, nationalIdEncrypted: true },
  });
  if (!p) {
    return { bankAccount: null, nationalId: null };
  }
  return {
    bankAccount: safeDecrypt(p.bankAccountEncrypted),
    nationalId: safeDecrypt(p.nationalIdEncrypted),
  };
}

function safeDecrypt(enc: string | null | undefined): string | null {
  if (enc == null || enc === "") return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}
