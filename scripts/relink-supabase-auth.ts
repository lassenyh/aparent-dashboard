/**
 * Fase 2 (docs/plan-samlet-wrapup.md): kobler Desk-brukere til kontoer i det
 * felles WrapUp Supabase-prosjektet (samme som Sign og Planner).
 *
 * Kjøres av administrator, én gang per database, etter at NEXT_PUBLIC_SUPABASE_URL
 * og SUPABASE_SERVICE_ROLE_KEY peker på det felles prosjektet.
 *
 *   npx tsx scripts/relink-supabase-auth.ts                    # prøvekjøring: viser planen
 *   npx tsx scripts/relink-supabase-auth.ts --apply            # kobler brukere som finnes
 *   npx tsx scripts/relink-supabase-auth.ts --apply --create-missing
 *       # oppretter også konto (uten passord) for Desk-brukere som mangler en;
 *       # de bruker «Glemt passord?» på innloggingssiden for å velge passord.
 *
 * Kobling skjer på e-post, men bare for bekreftede kontoer og bare når
 * administrator har sett planen. Skriptet endrer aldri tilganger.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

const apply = process.argv.includes("--apply");
const createMissing = process.argv.includes("--create-missing");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceKey) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY for det felles prosjektet.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function allAuthUsers() {
  const users: { id: string; email: string; confirmed: boolean }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) users.push({ id: u.id, email: u.email.toLowerCase(), confirmed: !!u.email_confirmed_at });
    }
    if (data.users.length < 1000) break;
  }
  return users;
}

async function main() {
  const dbHost = (() => { try { return new URL(process.env.DATABASE_URL ?? "").hostname; } catch { return "?"; } })();
  console.log(`Database: ${dbHost}`);
  console.log(`Supabase: ${new URL(supabaseUrl!).hostname}`);
  console.log(apply ? "Modus: ENDRER\n" : "Modus: prøvekjøring (ingen endringer)\n");

  const authUsers = await allAuthUsers();
  const byEmail = new Map(authUsers.map((u) => [u.email, u]));
  const deskUsers = await prisma.dashboardUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, email: true, isActive: true, supabaseAuthId: true },
  });

  for (const user of deskUsers) {
    const label = `${user.username}${user.email ? ` <${user.email}>` : ""}${user.isActive ? "" : " (deaktivert)"}`;
    const email = user.email?.trim().toLowerCase();
    if (!email) { console.log(`– ${label}: mangler e-post, hoppes over`); continue; }

    const match = byEmail.get(email);
    if (match && match.id === user.supabaseAuthId) { console.log(`✓ ${label}: allerede koblet`); continue; }

    if (match) {
      if (!match.confirmed) { console.log(`! ${label}: konto finnes, men e-posten er ikke bekreftet — hoppes over`); continue; }
      const taken = await prisma.dashboardUser.findUnique({ where: { supabaseAuthId: match.id }, select: { username: true } });
      if (taken && taken.username !== user.username) { console.log(`! ${label}: kontoen er allerede koblet til ${taken.username} — hoppes over`); continue; }
      console.log(`→ ${label}: kobles til eksisterende konto`);
      if (apply) await prisma.dashboardUser.update({ where: { id: user.id }, data: { supabaseAuthId: match.id } });
      continue;
    }

    if (!createMissing) { console.log(`+ ${label}: har ingen konto (kjør med --create-missing for å opprette)`); continue; }
    console.log(`+ ${label}: oppretter konto uten passord`);
    if (apply) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data.user) { console.log(`  ! kunne ikke opprette: ${error?.message ?? "ukjent feil"}`); continue; }
      await prisma.dashboardUser.update({ where: { id: user.id }, data: { supabaseAuthId: data.user.id } });
    }
  }

  if (!apply) console.log("\nIngenting er endret. Kjør med --apply for å gjennomføre.");
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
