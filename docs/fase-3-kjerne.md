# Fase 3: felles kjerne for Desk og Sign

Status: analyse, design og rydding er øvd. Ingenting er endret i produksjon. Skrevet 2026-11-09.
Overordnet plan: `docs/plan-samlet-wrapup.md`.

## 1. Funn (fra kopier av produksjon, 2026-11-09)

### Sign
- 41 organisasjoner, men bare **én ekte**: «Aparent AS» med org.nr **926696610**. Den har prosjekt **112 Direktesport**, 7 kontrakter, 4 personer (Sindre Harbak, Lasse Nyhaugen, Niels Windfeldt, Kjetil Ekeli) og 3 firmaer (Aparent AS, Amedia, TRY AS).
- Resten er test, bekreftet av Lasse:
  - 36 testorganisasjoner fra automatiske kjøringer (`@example.test`-brukere eller ingen medlemmer).
  - Den gamle «Aparent AS» uten org.nr (pilotdata: 106 DNB, 107 IKEA, 109 ODA, 110 IKEA, 111 SFN, E2E-, P-BATCH- og TEST-prosjekter).
  - «Lasse AS», som er en testprofil.
- 174 testbrukere (`@example.test`) i Sign sin `User`-tabell.
- Sign beskytter signerte kontrakter, kommentarer og revisjonslogg med database-triggere. Noen av dem har ikke vedlikeholdsunntak (kommentarer er «append-only»). Sletting av hele organisasjoner krever derfor at brukertriggerne slås av midlertidig i én transaksjon.

### Desk
- **8 ekte prosjekter**, alle beholdes: 102 Kiwi Fotball VM, 103 BI Aldri for sent (arkivert), 105 Gilde, 106 DNB 28 år, 107 Statens Vegvesen, 109 SFN Godfisk, 112 Amedia Direktesport og Sindre kortfilm (uten nummer).
- 56 personer, 7 kunder, 5 byråer, 74 crew-koblinger, 15 dagsplaner, 8 lønningslister og 3 brukere.
- Én duplikatperson: Erik Årseth (to rader med samme e-post).

### Overlapp mellom Desk og Sign (etter rydding)

| Hva | Desk | Sign | Treff |
|---|---|---|---|
| Prosjekt | 112 Direktesport | 112 Direktesport | Prosjektnummer |
| Firma | Amedia (kunde) | Amedia (kunde) | Navn |
| Firma | TRY (byrå, uten org.nr) | TRY AS (byrå, 980129942) | Navn uten «AS» → org.nr fra Sign |
| Firma | – | Aparent AS (egen org) | Bare i Sign |
| Person | Sindre Harbak | Sindre Harbak | E-post |
| Person | Lasse Nyhaugen, lasse@aparent.tv | Lasse Nyhaugen, lassenyh@gmail.com | Navn + telefon (452 68 957) |
| Person | Niels Windfeldt, niels@aparent.tv | Niels Windfeldt (uten e-post) | Navn |
| Person | – | Kjetil Ekeli | Bare i Sign |

Datamengden er liten. Sammenslåingen er i praksis å flytte Desk sine data inn i Sign sin «Aparent AS» og koble de få treffene over.

## 2. Rydding av Sign (klar)

`scripts/fase3/rydd-sign-testdata.ts`:
- **Beholder:** Bare organisasjonen med org.nr 926696610.
- **Sletter:** Alle andre organisasjoner med innhold, og testbrukere uten medlemskap.
- **Kjøring:** Prøvekjøring er standard, `--apply` sletter.
- **Sikkerhet:** Alt skjer i én transaksjon. Triggerne slås av og på igjen innenfor transaksjonen. Skriptet sjekker sluttilstanden (én organisasjon, ingen avslåtte triggere) før commit, og ruller ellers tilbake.

Øvd to ganger på ferske kopier av produksjon (Neon-grenene `fase3-ovelse` og `fase3-skripttest`):
- **Resultat:** 38 organisasjoner og 174 testbrukere slettet.
- **Igjen:** «Aparent AS» med 112 Direktesport og 7 kontrakter, og brukerne `lasse@aparent.tv` og `lassenyh@gmail.com`.

Ikke ryddet: testkontoene for `@example.test` i Supabase Auth (det felles innloggingsprosjektet). De kan slettes senere med Supabase-admin, og påvirker ikke data.

## 3. Endret rekkefølge: Sign inn i Desk-repoet før databasene slås sammen

Planen hadde felles kjerne (fase 3) før Sign som modul (fase 4). Det viser seg å være vanskelig:
- **To migreringshistorikker:** Sign-repoet eier Sign-databasen. Bygget kjører `prisma migrate deploy` med 63 migreringer og har egne triggere. Legger Desk sine tabeller seg i samme database fra et annet repo, får én database to migreringshistorikker som går i beina på hverandre.
- **Ett skjema må ha én eier.** Den felles kjernen er ett Prisma-skjema og må ligge ett sted.

**Ny anbefalt rekkefølge:**
1. **3a. Rydd Sign** med skriptet over, i produksjon.
2. **3b. Flytt Sign-koden inn i aparent-dashboard** under `/sign`. Sign beholder sin egen database og Prisma-klient i denne fasen, mens Desk har sin. Begge bruker Prisma 7.9.1 og Next 16.3, så to klienter side om side er greit. Sign sitt Vercel-prosjekt blir en videresending.
3. **3c. Felles skjema i ett repo:**
   - **Grunnlag:** Sign sitt skjema og migreringshistorikk.
   - **Nye tabeller:** Desk sine modultabeller legges til som nye migreringer (dagsplan, lønningslister, call sheets, crewlister, invitasjoner, tilganger).
   - **Kjernen utvides** med Desk sine felter (se avsnitt 4).
   - **Dataflytting:** Et engangsskript flytter Desk-data inn. Øves på kopier.
4. **3d. Desk-koden går over** fra egne `Project`, `Person`, `Customer` og `Agency` til kjernen. Det er den største kodejobben.
5. **3e. Pensjoner** Desk sin gamle database etter en periode med skrivebeskyttelse.

## 4. Feltkartlegging (Desk → kjerne)

**Organisasjon:** All Desk-data får `organizationId` = «Aparent AS» (926696610).

**Firma (`Company`)**
- Desk `Customer` → `Company` med `isClient`. Logo (`logoUrl`) legges til på `Company`.
- Desk `Agency` → `Company` med `isAgency`, og `orgNumber` → `organizationNumber`.
- Finnes samme firma, slås de sammen: på org.nr, ellers på navn uten «AS».

**Prosjekt (`Project`)**
- `internalTitle` → `projectNumber`. Sindre kortfilm har ikke nummer, og må få et eller tillate tomt nummer. **Beslutning trengs.**
- `name` → `name`.
- `status` active/archived → `ACTIVE`/`ARCHIVED` (`archivedAt`).
- `customerId` og `agencyId` → `ProjectCompany` med rollene kunde og byrå.
- `startDate`/`endDate` → nye felt på `Project`, eller `ProjectShootDate`. **Anbefaling:** Nye felt for produksjonsperiode. Opptaksdager kommer fra dagsplaner.
- `notes` → nytt felt.
- Produsent og regissør: Desk utleder dem fra crew-roller (`sync-project-leads`), mens Sign har `producerUserId` og `directorPersonId`. Kobles der det finnes treff.

**Person (`Person`)**
- Felles felter: navn, e-post, telefon og adresse (Desk sin strukturerte adresse passer Sign sin).
- **Nye felt fra Desk:**
  - `roles[]`, `defaultRate` og `rateType`
  - `dietaryPreference` og `allergies`
  - `internalStarRating` (bare internt)
  - `bankAccountEncrypted` og `nationalIdEncrypted` (samme AES-nøkkel og samme tilgangsregler som i dag)
  - `isActive` og `lastUsedAt`
- Sign har `@@unique([organizationId, email])`. Desk-duplikatet Erik Årseth må slås sammen før flytting.

**Crew (`ProjectMember`)**
- Desk `ProjectCrew` → ny `ProjectMember` (rolle, sats og satstype for prosjektet, notat, rekkefølge, aktiv).
- Sign sin `Engagement` er kontraktsiden av samme person på samme prosjekt. Den får en valgfri kobling til `ProjectMember`.

**Brukere og tilgang**
- Desk `DashboardUser` → Sign `User`, koblet via `supabaseAuthId`, som allerede er felles etter fase 2. `isInternal` → `Membership.role`.
- Desk `ProjectMembership` (lese- og skriverett per modul) → ny `ProjectAccessGrant` for eksterne brukere.

**Modultabeller** (`Dagsplan*`, `PayrollList`/`PayrollRow`, `CallSheet*`, `ProjectCrewList*`, `ProjectInvitation`, `DashboardSession`)
- Flyttes som de er, med `organizationId` og nye fremmednøkler til kjernen.
- Gamle cuid-ID-er beholdes som primærnøkler der det går, så gamle lenker til dagsplaner, delte crewlister og lønningslister fortsatt virker.

## 5. Beslutninger som trengs

1. **Ny rekkefølge** (avsnitt 3): Sign-koden inn i Desk-repoet før databasene slås sammen?
2. **Prosjektnummer for Sindre kortfilm:** Gi den et nummer, eller tillate prosjekter uten nummer i kjernen? Sign krever i dag nummer.
3. **Lasse sin person:** Hvilken e-post skal Lasse Nyhaugen ha på personen i kjernen: `lasse@aparent.tv` eller `lassenyh@gmail.com`?
4. **Tidspunkt for ryddingen av Sign i produksjon:** Skriptet er klart.

## 6. Kjøring av ryddingen i produksjon

1. **Sikkerhetskopi:** Lag en Neon-gren av produksjon i Sign-prosjektet (`aparent_contracts`), for eksempel `for-rydding-2026-11-xx`. Den er sikkerhetskopien.
2. **Direkte tilkobling:** Hent den til produksjonen (ikke `-pooler`).
3. **Prøvekjøring:**
   ```bash
   SIGN_DATABASE_URL='…' npx tsx scripts/fase3/rydd-sign-testdata.ts
   ```
   Den skal liste 38 organisasjoner, og bare «Aparent AS (926696610)» som beholdt.
4. **Ekte kjøring:** Samme kommando med `--apply`.
5. **Sjekk** at Sign virker, og at 112 Direktesport med kontrakter er intakt.
