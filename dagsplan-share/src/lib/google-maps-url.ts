/** Bygger Google Maps-søkelenke fra fritekst (adresse, stedsnavn, koordinater). */
export function buildGoogleMapsSearchUrl(query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
