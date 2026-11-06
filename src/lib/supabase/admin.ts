import "server-only";
import { createClient } from "@supabase/supabase-js";
export function supabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error("Supabase Auth er ikke konfigurert.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase Auth er ikke ferdig konfigurert. Kontakt administrator.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
