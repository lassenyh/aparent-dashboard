/** Deler som lagres i DB; vises som én linje i PDF/utskrift. */

export type AddressParts = {
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

/** F.eks. «Storgata 1, 0162 Oslo, Norge» */
export function formatNorwegianAddressLine(parts: AddressParts): string {
  const line = parts.addressLine?.trim();
  const pc = parts.postalCode?.trim();
  const city = parts.city?.trim();
  const land = parts.country?.trim();

  const poststed = [pc, city].filter(Boolean).join(" ");
  const segments = [line, poststed || null, land].filter(
    (s): s is string => Boolean(s?.length),
  );
  return segments.join(", ");
}
