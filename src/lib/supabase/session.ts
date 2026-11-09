import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase-klient som leser og skriver økten i cookies (samme format og navn
 * som Sign og Planner bruker, `sb-<prosjekt>-auth-token`). På samme domene
 * (wrapup.aparent.tv) deler da Desk og Planner innloggingsøkt.
 * Kun for route handlers / server actions — der kan cookies settes.
 */
export async function supabaseSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error("Supabase Auth er ikke konfigurert.");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          store.set(name, value, { ...options, path: "/" });
        }
      },
    },
  });
}

/** Har forespørselen en Supabase-øktcookie (uten å verifisere den)? */
export function hasSupabaseSessionCookie(names: Iterable<string>): boolean {
  for (const name of names) {
    if (name.startsWith("sb-") && name.includes("-auth-token")) return true;
  }
  return false;
}
