import { get } from "@vercel/blob";
import { isVercelBlobPublicUrl } from "@/lib/img-url";

export const runtime = "nodejs";

const ALLOWED_CONTENT_PREFIX = "image/";

/**
 * Same-origin proxy for Vercel Blob-bilder (Safari + same-origin).
 * Bruker @vercel/blob `get` med Bearer-token: ren fetch() til blob-URL returnerer ofte 404
 * fra server fordi Vercel Blob forventer autorisasjon — nettleseren trenger ikke det.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw?.trim()) {
    return new Response("Missing url", { status: 400 });
  }

  let target: string;
  try {
    target = decodeURIComponent(raw.trim());
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (!isVercelBlobPublicUrl(target)) {
    return new Response("Forbidden", { status: 403 });
  }

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

  if (hasBlobToken) {
    try {
      const result = await get(target, { access: "public" });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return new Response(null, { status: 404 });
      }
      const ct = result.blob.contentType ?? "";
      if (!ct.toLowerCase().startsWith(ALLOWED_CONTENT_PREFIX)) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response(result.stream, {
        status: 200,
        headers: {
          "Content-Type": ct,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch (e) {
      console.error("[public-image] @vercel/blob get failed:", e);
      return new Response("Bad gateway", { status: 502 });
    }
  }

  /** Lokalt uten BLOB_READ_WRITE_TOKEN: prøv åpen GET (samme som nettleser). */
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      cache: "no-store",
    });
  } catch (e) {
    console.error("[public-image] fetch failed:", e);
    return new Response("Bad gateway", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  const ct = upstream.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith(ALLOWED_CONTENT_PREFIX)) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
