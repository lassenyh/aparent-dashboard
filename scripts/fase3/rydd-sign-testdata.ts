/**
 * Fase 3, steg 1 (docs/fase-3-kjerne.md): rydder testdata i Sign sin database.
 *
 * Beholder KUN organisasjonen med organisasjonsnummer 926696610 («Aparent AS»).
 * Alle andre organisasjoner (testkjøringer, den gamle «Aparent AS» uten org.nr og
 * «Lasse AS») slettes med alt innhold, og testbrukere (@example.test) uten
 * medlemskap slettes. Øvd på Neon-grenen «fase3-ovelse» 2026-11-09.
 *
 * Sign beskytter signerte kontrakter, kommentarer og revisjonslogg med triggere.
 * Skriptet slår av brukertriggerne på de berørte tabellene INNE I ÉN TRANSAKSJON,
 * sletter, og slår dem på igjen før commit. Feiler noe, rulles alt tilbake.
 *
 *   SIGN_DATABASE_URL=… npx tsx scripts/fase3/rydd-sign-testdata.ts          # prøvekjøring
 *   SIGN_DATABASE_URL=… npx tsx scripts/fase3/rydd-sign-testdata.ts --apply  # sletter
 *
 * Bruk direkte (ikke-pooled) tilkobling. Ta et Neon-øyeblikksbilde/gren først.
 */
import { Client } from "pg";

const KEEP_ORG_NUMBER = "926696610";
const apply = process.argv.includes("--apply");
const url = process.env.SIGN_DATABASE_URL;
if (!url) {
  console.error("Mangler SIGN_DATABASE_URL (Sign sin database, direkte tilkobling).");
  process.exit(1);
}

async function main() {
  const db = new Client({ connectionString: url });
  await db.connect();
  const host = new URL(url!).hostname;
  console.log(`Database: ${host}`);
  console.log(apply ? "Modus: SLETTER\n" : "Modus: prøvekjøring (ingen endringer)\n");

  const keep = await db.query(`SELECT id, name FROM "Organization" WHERE "organizationNumber" = $1`, [KEEP_ORG_NUMBER]);
  if (keep.rowCount !== 1) {
    console.error(`Fant ${keep.rowCount} organisasjoner med org.nr ${KEEP_ORG_NUMBER} — forventet nøyaktig én. Avbryter.`);
    process.exit(1);
  }
  const keepId: string = keep.rows[0].id;
  console.log(`Beholdes: ${keep.rows[0].name} (${KEEP_ORG_NUMBER})\n`);

  const doomed = await db.query(
    `SELECT o.id, o.name,
       (SELECT count(*) FROM "Project" p WHERE p."organizationId" = o.id)::int AS projects,
       (SELECT count(*) FROM "Contract" c WHERE c."organizationId" = o.id)::int AS contracts
     FROM "Organization" o WHERE o.id <> $1 ORDER BY o."createdAt"`,
    [keepId],
  );
  for (const o of doomed.rows) console.log(`– slettes: ${o.name} (${o.projects} prosjekter, ${o.contracts} kontrakter)`);
  const testUsers = await db.query(
    `SELECT count(*)::int AS n FROM "User" u WHERE u.email ILIKE '%@example.test'
       AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."userId" = u.id AND m."organizationId" = $1)`,
    [keepId],
  );
  console.log(`\n${doomed.rowCount} organisasjoner og ${testUsers.rows[0].n} testbrukere (@example.test) slettes.`);

  if (!apply) {
    console.log("\nIngenting er endret. Kjør med --apply for å slette.");
    await db.end();
    return;
  }

  await db.query("BEGIN");
  try {
    await db.query(
      `DO $$
      DECLARE
        orgs uuid[] := (SELECT array_agg(id) FROM "Organization" WHERE id <> '${keepId}'::uuid);
        tbls text[] := (SELECT array_agg(table_name::text) FROM information_schema.columns
                         WHERE table_schema = 'public' AND column_name = 'organizationId' AND table_name <> 'Organization');
        t text; r record; pass int; n int;
      BEGIN
        FOREACH t IN ARRAY tbls LOOP EXECUTE format('ALTER TABLE %I DISABLE TRIGGER USER', t); END LOOP;
        FOR pass IN 1..40 LOOP
          n := 0;
          FOREACH t IN ARRAY tbls LOOP
            FOR r IN EXECUTE format('SELECT ctid FROM %I WHERE "organizationId" = ANY($1)', t) USING orgs LOOP
              BEGIN
                EXECUTE format('DELETE FROM %I WHERE ctid = $1', t) USING r.ctid;
                n := n + 1;
              EXCEPTION WHEN foreign_key_violation OR restrict_violation THEN NULL;
              END;
            END LOOP;
          END LOOP;
          EXIT WHEN n = 0;
        END LOOP;
        DELETE FROM "Organization" WHERE id = ANY(orgs);
        FOREACH t IN ARRAY tbls LOOP EXECUTE format('ALTER TABLE %I ENABLE TRIGGER USER', t); END LOOP;
      END $$`,
    );
    const users = await db.query(
      `DELETE FROM "User" u WHERE u.email ILIKE '%@example.test'
         AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."userId" = u.id)`,
    );
    const left = await db.query(`SELECT count(*)::int AS n FROM "Organization"`);
    const disabled = await db.query(`SELECT count(*)::int AS n FROM pg_trigger WHERE NOT tgisinternal AND tgenabled <> 'O'`);
    if (left.rows[0].n !== 1 || disabled.rows[0].n !== 0) throw new Error("Uventet sluttilstand — ruller tilbake.");
    await db.query("COMMIT");
    console.log(`\nFerdig: ${doomed.rowCount} organisasjoner og ${users.rowCount} testbrukere slettet. Alle triggere er på igjen.`);
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Feilet, alt er rullet tilbake:", err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
