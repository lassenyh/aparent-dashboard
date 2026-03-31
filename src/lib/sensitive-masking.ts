/**
 * Maskering for visning på crew-profil (ikke kryptert streng inn).
 * Brukes også etter nødvendig dekryptering på server.
 */

export function maskBankAccount(plain: string | null | undefined): string {
  if (!plain?.trim()) return "—";
  const digits = plain.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  const last4 = digits.slice(-4);
  return `**** **** ${last4}`;
}

/** Fødselsnummer (11 siffer): viser 6 første + maskert rest (5 stjerner). */
export function maskNationalId(plain: string | null | undefined): string {
  if (!plain?.trim()) return "—";
  const digits = plain.replace(/\D/g, "");
  if (digits.length === 0) return "—";
  if (digits.length <= 6) return "******";
  return `${digits.slice(0, 6)} *****`;
}
