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

/** Kun Vercel Blob public-URL-er (samme som i logo-opplasting). Brukes til SSRF-beskyttelse i proxy. */
export function isVercelBlobPublicUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (
      u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

/**
 * Safari kan blokkere direkte <img src> til *.public.blob.vercel-storage.com (ingen status i nettverkspanel).
 * Proxy via same-origin /api/public-image omgår dette.
 */
export function resolvePublicImageSrcForImgTag(
  raw: string | null | undefined,
): string | null {
  const safe = sanitizePublicImageUrl(raw);
  if (!safe) return null;
  if (isVercelBlobPublicUrl(safe)) {
    return `/api/public-image?url=${encodeURIComponent(safe)}`;
  }
  return safe;
}
