import { isVercelBlobPublicUrl } from "@/lib/img-url";

export const runtime = "nodejs";

const ALLOWED_CONTENT_PREFIX = "image/";

/**
 * Same-origin proxy for Vercel Blob-bilder. Safari blokkerer ofte direkte lasting fra
 * *.public.blob.vercel-storage.com slik at forespørselen aldri sendes (tom status i Web Inspector).
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

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      next: { revalidate: 86400 },
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
