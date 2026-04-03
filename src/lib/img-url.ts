/**
 * Normaliserer bilde-URL for <img src> på HTTPS-sider.
 * Safari (og andre) blokkerer ofte «mixed content»: http-URL på https-side.
 * Oppgraderer http → https for absolutte URL-er (typisk eldre data / Blob).
 */
export function sanitizePublicImageUrl(
  url: string | null | undefined,
): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (t.startsWith("http://")) {
    return `https://${t.slice("http://".length)}`;
  }
  return t;
}
