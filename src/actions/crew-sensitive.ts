"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { maskBankAccount, maskNationalId } from "@/lib/sensitive-masking";

export async function getPersonSensitiveMaskedDisplay(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { bankAccountEncrypted: true, nationalIdEncrypted: true },
  });
  if (!person) return null;

  let bankPlain: string | null = null;
  let nationalPlain: string | null = null;
  try {
    if (person.bankAccountEncrypted) {
      bankPlain = decrypt(person.bankAccountEncrypted);
    }
    if (person.nationalIdEncrypted) {
      nationalPlain = decrypt(person.nationalIdEncrypted);
    }
  } catch {
    return {
      hasBankAccount: !!person.bankAccountEncrypted,
      hasNationalId: !!person.nationalIdEncrypted,
      bankMasked: "Kunne ikke dekryptere",
      nationalMasked: "Kunne ikke dekryptere",
      decryptError: true as const,
    };
  }

  return {
    hasBankAccount: !!person.bankAccountEncrypted,
    hasNationalId: !!person.nationalIdEncrypted,
    bankMasked: maskBankAccount(bankPlain),
    nationalMasked: maskNationalId(nationalPlain),
    decryptError: false as const,
  };
}

export async function revealPersonSensitiveData(personId: string): Promise<
  | { ok: true; bankAccount: string | null; nationalId: string | null }
  | { error: string }
> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { bankAccountEncrypted: true, nationalIdEncrypted: true },
  });
  if (!person) return { error: "Personen finnes ikke" };
  try {
    return {
      ok: true,
      bankAccount: person.bankAccountEncrypted
        ? decrypt(person.bankAccountEncrypted)
        : null,
      nationalId: person.nationalIdEncrypted
        ? decrypt(person.nationalIdEncrypted)
        : null,
    };
  } catch {
    return { error: "Kunne ikke dekryptere. Sjekk ENCRYPTION_KEY." };
  }
}

const saveSensitiveSchema = z.object({
  bankAccount: z.string(),
  nationalId: z.string(),
});

export async function savePersonSensitiveData(
  personId: string,
  _prev: { error: string } | { success: true } | null,
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const raw = {
    bankAccount: String(formData.get("bankAccount") ?? ""),
    nationalId: String(formData.get("nationalId") ?? ""),
  };
  const parsed = saveSensitiveSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Ugyldig data" };
  }

  const bankDigits = parsed.data.bankAccount.replace(/\D/g, "");
  const nationalDigits = parsed.data.nationalId.replace(/\D/g, "");

  if (nationalDigits.length > 0 && nationalDigits.length !== 11) {
    return { error: "Personnummer må være 11 siffer (eller tomt)" };
  }

  const exists = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true },
  });
  if (!exists) return { error: "Personen finnes ikke" };

  let bankAccountEncrypted: string | null = null;
  let nationalIdEncrypted: string | null = null;
  try {
    bankAccountEncrypted = bankDigits ? encrypt(bankDigits) : null;
    nationalIdEncrypted = nationalDigits ? encrypt(nationalDigits) : null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kryptering feilet";
    return { error: msg };
  }

  await prisma.person.update({
    where: { id: personId },
    data: { bankAccountEncrypted, nationalIdEncrypted },
  });

  revalidatePath("/crew");
  revalidatePath(`/crew/${personId}`);
  return { success: true };
}
