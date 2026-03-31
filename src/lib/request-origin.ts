import { headers } from "next/headers";

/** Basis-URL for delingslenker (Vercel: x-forwarded-host). Fallback: NEXT_PUBLIC_APP_URL. */
export async function getRequestOrigin(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
