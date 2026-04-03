/**
 * Normaliserer bilde-URL for <img src> på HTTPS-sider.
 * Safari (WebKit) blokkerer ofte «mixed content»: http-URL på https-side.
 * Oppgraderer http → https og gjør protokoll-relative URL-er (`//host/...`) eksplisitt til https.
 */
export function sanitizePublicImageUrl(
  url: string | null | undefined,
): string | null {
  let t = url?.trim();
  if (!t) return null;
  if (t.startsWith("//")) {
    t = `https:${t}`;
  }
  if (t.startsWith("http://")) {
    return `https://${t.slice("http://".length)}`;
  }
  return t;
}
