import "server-only";
export function invitationConfiguration() {
  const missing = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "NEXT_PUBLIC_APP_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(key => !process.env[key]?.trim());
  return { ready: missing.length === 0, missing };
}
export function invitationOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) throw new Error("Appens offentlige adresse er ikke konfigurert.");
  const url = new URL(value);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && url.hostname === "localhost")) throw new Error("Invitasjonsadressen må bruke HTTPS.");
  return url.origin;
}
