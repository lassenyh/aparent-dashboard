import { get } from "@vercel/blob";
import { isVercelBlobPublicUrl } from "@/lib/img-url";

export const runtime = "nodejs";

const ALLOWED_CONTENT_PREFIX = "image/";

function contentTypeForImageResponse(
  headerCt: string,
  requestUrl: string,
): string | null {
  const ct = headerCt.trim().toLowerCase();
  if (ct.startsWith(ALLOWED_CONTENT_PREFIX)) {
    return headerCt.trim();
  }
  if (ct.includes("octet-stream")) {
    const ext = /\.(png|jpe?g|gif|webp|svg)$/i.exec(requestUrl);
    if (ext) {
      const map: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
      };
      const key = ext[1].toLowerCase();
      return map[key] ?? null;
    }
  }
  return null;
}

/** Noen CDN-er svarer dårlig på Node sin standard User-Agent. */
const BROWSER_LIKE_UA =
  "Mozilla/5.0 (compatible; AparentDashboard/1.0; +https://vercel.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Same-origin proxy for Vercel Blob (Safari blokkerer ofte direkte tredjeparts-<img>).
 *
 * 1) **fetch uten Bearer** — offentlige `*.public.blob.vercel-storage.com`-URL-er er åpne
 *    (samme som Chrome/Safari mot blob direkte). Må prøves først.
 * 2) **`@vercel/blob` `get`** — reserve; `get` med `BLOB_READ_WRITE_TOKEN` kan gi **404**
 *    hvis tokenet er fra en *annen* Blob-store enn URL-en (vanlig ved flere miljøer / gammel URL).
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

  const tryRespondFromFetch = (upstream: Response) => {
    const headerCt = upstream.headers.get("content-type") ?? "";
    const ct = contentTypeForImageResponse(headerCt, target);
    if (!ct) return null;
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  };

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": BROWSER_LIKE_UA,
      },
    });
  } catch (e) {
    console.error("[public-image] fetch failed:", e);
    upstream = new Response(null, { status: 502 });
  }

  if (upstream.ok) {
    const out = tryRespondFromFetch(upstream);
    if (out) return out;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    try {
      const result = await get(target, { access: "public" });
      if (result?.statusCode === 200 && result.stream) {
        const rawCt = result.blob.contentType ?? "";
        const ct = contentTypeForImageResponse(rawCt, target);
        if (ct) {
          return new Response(result.stream, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Cache-Control":
                "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      }
    } catch (e) {
      console.error("[public-image] @vercel/blob get fallback failed:", e);
    }
  }

  const status = upstream.ok ? 404 : upstream.status;
  return new Response(null, { status: status >= 400 ? status : 404 });
}
