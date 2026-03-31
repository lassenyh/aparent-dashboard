/**
 * Norsk mobilnummer uten landskode: nøyaktig 8 siffer.
 * Tolker +47 / 0047 og valgfritt ledende 0.
 */

export function normalizeNorwegianMobileDigits(
  raw: string | null | undefined,
): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 0) return null;
  if (d.startsWith("0047") && d.length >= 12) {
    d = d.slice(4);
  } else if (d.startsWith("47") && d.length >= 10) {
    d = d.slice(2);
  }
  if (d.length === 9 && d.startsWith("0")) {
    d = d.slice(1);
  }
  if (d.length === 8) return d;
  return null;
}

/** Visning: «123 45 678» */
export function formatNorwegianMobile8(digits: string): string {
  if (digits.length !== 8) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}`;
}

export function formatNorwegianMobileFromRaw(
  raw: string | null | undefined,
): string | null {
  const d = normalizeNorwegianMobileDigits(raw);
  return d ? formatNorwegianMobile8(d) : null;
}

/** Delvis formatering mens brukeren skriver (maks 8 siffer). */
export function formatPartialNorwegianMobile(digitsRaw: string): string {
  const d = digitsRaw.replace(/\D/g, "").slice(0, 8);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
}
