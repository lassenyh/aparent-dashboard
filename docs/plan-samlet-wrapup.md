# Plan: Desk og Sign i én WrapUp-app, med Planner ved siden av

Status: forslag, ingenting er bygget eller migrert. Skrevet 2026-11-09.

## 1. Mål

- **Ett prosjekt for Desk og Sign.** Prosjektinfo legges inn én gang, i et skjema som dekker alt Desk og Sign trenger. Det tar litt lengre tid å opprette, men gjøres aldri to ganger.
- **Planner står for seg selv inntil videre.** I Planner opprettes prosjekter ofte før de er vunnet, for å lage fremdriftsplaner til en pitch. Planner beholder derfor egne prosjekter og egen database, uavhengig av Desk og Sign. Den deler bare innlogging (det gjør den allerede med Sign), design og startside. En kobling mellom en plan og et prosjekt i Desk og Sign kan legges til senere, når det er behov.
- **Appene bestemmer hva de bruker.** All prosjektinfo ligger i én felles kjerne. Hver app (modul) viser og bruker bare den delen den trenger. Det er appene, ikke dataene, som begrenser hva som deles.
- **En minimalistisk startside.** Etter innlogging kommer man til en skjerm som minner om hjemskjermen på en iPhone: ett ikon per app, og du velger hvor du skal.
- **Én innlogging og ett domene** for alle tre, og **én database** for Desk og Sign.

Ytelsen påvirkes ikke. Alle tre kjører allerede i Frankfurt-regionen, og Next.js laster bare koden for siden man er på.

## 2. Slik er det i dag

| | Desk | Sign | Planner |
|---|---|---|---|
| Repo | `aparent-dashboard` | `aparent_contracts` | `wrapup-planner` |
| Adresse | aparent-dashboard.vercel.app | wrapup-sign.vercel.app | wrapup-planner.vercel.app |
| Next.js | 16.2.1 | 16.3.0 (bygges med webpack) | 16.3.4 |
| Datatilgang | Prisma 6 | Prisma 7 med `adapter-pg` | Supabase/Postgres direkte, ingen Prisma |
| Database | Neon, eu-central-1 (eget prosjekt) | Neon, eu-central-1 (eget prosjekt) | Supabase Postgres, skjemaet `planner` |
| Innlogging | Egne brukere (`DashboardUser`) og egne økter (`DashboardSession`). Eget Supabase-prosjekt (`cfnieu…`) | Supabase Auth (`xpjkng…`) | **Samme Supabase Auth som Sign** (`xpjkng…`) |
| Organisering | Én organisasjon (Aparent). Interne brukere ser alt, eksterne får tilgang per prosjekt og modul | Flere organisasjoner: `organizationId` på hver rad, roller per organisasjon | Hver bruker eier sine egne prosjekter (`owner`) |
| Størrelse | Rundt 30 modeller | Rundt 90 modeller, 63 migreringer | 11 tabeller |

To av tre apper deler allerede innlogging, og det er Sign sitt Supabase-prosjekt. Det gjør valget av innlogging enkelt.

## 3. Målbildet

```
wrapup.aparent.tv            (ett domene, én innlogging)
├── /                        Startside: app-ikoner
├── /desk/...                Prosjekter, crew, dagsplaner, lønningslister
├── /sign/...                Kontrakter, maler, signering, bruksrett
├── /planner/...             Planner: egen app, vist under samme domene
└── /prosjekter/ny           Felles prosjektopprettelse (Desk og Sign)
```

- **Én Next.js-app** (vertsappen) med Desk og Sign som moduler. Tjenestevelgeren i logoen og overgangsanimasjonen beholdes, men bytter nå mellom moduler i samme app.
- **Planner forblir en egen app** med egen kode, deploy og database. Den legges under samme domene på `/planner` med en videresending på serveren (en Vercel-rewrite), så den ser ut som en del av WrapUp. Siden Planner og vertsappen da bruker samme Supabase Auth på samme domene, deler de også innloggingsøkt. Man logger altså inn én gang for alle tre.
- **Én database for Desk og Sign:** Neon i Frankfurt, med en felles kjerne og egne tabeller per modul.
- **Én innlogging:** Supabase Auth-prosjektet Sign og Planner allerede bruker.
- **Én tilgangsmodell:** Organisasjon og rolle for interne, og tilgang per prosjekt og modul for eksterne. Desk-modellen med lese- og skriverett per modul tas med.

### Hvorfor Desk og Sign blir én app

Når Desk og Sign bruker de samme prosjektene, personene og firmaene, måtte to separate apper dele databaseskjema, innlogging, tilganger og design, og holde alt i takt over to deploys. For et lite team er det mer arbeid enn det gir. Én app gir én deploy, ett skjema og innlogging uten noe ekstra.

Det som taper på det er uavhengige deploys: en feil i én modul kan stoppe deployen av alle. Det veies opp med tester og forhåndsvisningsmiljø (preview) per pull request (se fase 0).

## 4. Felles kjerne

Kjernen er det Desk og Sign deler. Planner er ikke med i kjernen. Den bygges på **Sign sin modell**, fordi den allerede er laget for flere organisasjoner, bruker UUID-er og har riktig oppdeling av firmaer, kontaktpersoner, prosjekter og roller. Det Desk har som Sign mangler, legges til.

| Felles modell | Fra Sign | Fra Desk |
|---|---|---|
| `Organization` | `Organization` | (Aparent blir én organisasjon) |
| `User` + `Membership` | `User`, `Membership` (rolle, kan kontrasignere) | `DashboardUser` (`isInternal` → rolle) |
| `ProjectAccessGrant` (nytt) | – | `ProjectMembership` med lese- og skriverett per modul |
| `Company` | `Company` (`isClient`, `isAgency`) | `Customer` + `Agency` slås sammen her |
| `CompanyContact` | `CompanyContact` | – |
| `Person` | `Person` (adresse, betalingsmåte) | `Person` (roller, sats, kosthold, allergier, kryptert kontonummer og fødselsnummer, stjernevurdering) |
| `Project` | `Project` (prosjektnummer, status, produsent, regissør, regnskapskontakt) | `Project` (`internalTitle` = prosjektnummer, start- og sluttdato, notater) |
| `ProjectCompany` | Kunde, byrå og andre roller per prosjekt | `customerId`, `agencyId` |
| `ProjectShootDate` | Opptaksperioder | Datoer fra `Project` og dagsplaner |
| `ProjectMember` (crew) | `Engagement` (type, rolle, status, datoer) | `ProjectCrew` (rolle, sats, notat, rekkefølge) |

Prinsipper for kjernen:

- **Personopplysninger ett sted.** Kontonummer og fødselsnummer beholder Desk sin kryptering (AES-256-GCM, `ENCRYPTION_KEY`) og vises bare med rett tilgang, som i dag.
- **Prosjektnummer er nøkkelen** for å finne samme prosjekt på tvers under migreringen (Desk `internalTitle` ↔ Sign `projectNumber`).
- **Moduler peker inn i kjernen, ikke omvendt.** En kontrakt peker på `Project` og `Person`, og en dagsplan peker på `Project`. Kjernen vet ikke hvilke moduler som finnes.
- **Moduler slås på per prosjekt.** Feltet `Project.modules` sier hva prosjektet bruker, for eksempel `desk` og `sign`. Det styrer hva som vises på startsiden og i prosjektet, ikke hvilke data som finnes.

### Modulenes egne tabeller

- **Desk:** `Dagsplan*`, `PayrollList`/`PayrollRow`, `CallSheet*`, `ProjectCrewList*`, invitasjoner. De får `organizationId` og peker på kjernens `Project`, `Person` og `ProjectMember`.
- **Sign:** Alt med kontrakter, maler, signaturer, bruksrett, opsjoner, betalinger og revisjonslogg. Det beholdes som det er og pekes om til kjernen der det i dag peker på Sign sine egne prosjekter og personer.
- **Planner:** Uendret. Beholder egne tabeller i Supabase Postgres og egne prosjekter.

## 5. Felles prosjektopprettelse

Ett skjema, `/prosjekter/ny`, delt i seksjoner. Bare det første er påkrevd. Planner beholder sin egen, raske måte å opprette prosjekter på.

1. **Grunninfo** (påkrevd): prosjektnummer, prosjektnavn, kunde, byrå og status.
2. **Folk:** produsent, regissør, regnskapskontakt og kontaktpersoner hos kunde og byrå.
3. **Datoer:** opptaksperioder og eventuelle milepæler (leveranse, publisering).
4. **Moduler:** hak av Desk og/eller Sign. Hver valgt modul kan vise et par egne felt:
   - **Sign:** Bruksrett (territorium, periode, medier), standard kontraktsmal.
   - **Desk:** Standard crewliste, første dagsplan.
5. **Oppsummering:** «Opprett prosjekt».

Etterpå kan alt redigeres fra prosjektets side. En modul kan slås på senere uten å legge inn noe på nytt.

Det dette åpner for senere:
- Crew lagt inn i Desk kan få kontrakt i Sign med ett klikk, med rolle, sats og datoer forhåndsutfylt.
- Senere, hvis det trengs: en plan i Planner kan kobles til et prosjekt i Desk og Sign, så opptaksdatoer kan bli forslag til dagsplaner eller tekniske befaringer.
- Prosjektsiden kan vise status på tvers, for eksempel «5 av 8 kontrakter signert» eller «neste milepæl om 4 dager».

## 6. Startsiden

- **Plassering:** `/`, rett etter innlogging.
- **Hjemskjerm:** Ett stort ikon per app i et rutenett, slik som på en iPhone. Ikonet er WrapUp-merket med appens farge på firkanten som stikker ut, og navnet står under: desk (grønn), sign (seglrød), planner (egen farge).
- **Tilgang:** Bare apper brukeren har tilgang til vises.
- **Planner-ikonet** åpner Planner-appen under `/planner`.
- **Ingenting annet** på siden, bortsett fra kanskje en diskret «Fortsett i …» med sist brukte prosjekt og en innloggingsmeny i hjørnet.
- **Overgang:** Den samme som i tjenestevelgeren i dag: merket tar en runde, firkanten skifter farge og modulen åpnes.

Startsiden kan bygges i fase 1, før noe er slått sammen. Da lenker ikonene til dagens tre adresser.

## 7. Faser

Hver fase kan deployes for seg og lar appene virke underveis.

### Fase 0: Gjør det trygt å jobbe (før alt annet)

- **Lokal utvikling mot kopi:** I dag kjører lokal utvikling av Desk mot produksjonsdatabasen. Lag en egen Neon-gren for utvikling og én for staging, for både Desk og Sign.
- **Preview-miljø per pull request** med egen database.
- **Endringer via pull request**, slik reglene på `main` allerede krever.
- **Telling:** Antall prosjekter, personer, firmaer og kontrakter i Desk og Sign, så vi vet hvor mye som må slås sammen.
- **Sikkerhetskopi:** Fullt øyeblikksbilde av databasene til Desk og Sign.

*Ferdig når:* Ingen utvikling skjer mot produksjonsdata, og vi har tallene.

### Fase 1: Vertsapp og startside

- Oppgrader Desk til Next.js 16.3 og Prisma 7, så den står likt med Sign.
- Legg inn startsiden med app-ikoner som lenker til dagens tre adresser.
- Flytt felles design (tema, logo, tjenestevelger og ikoner) til én mappe som modulene skal dele.
- Sett opp domenet `wrapup.aparent.tv` (navnet bestemmes). Desk flyttes til `/desk`, og gamle adresser videresendes.
- Planner legges under `/planner` på samme domene med en Vercel-rewrite til Planner-appen. Planner må da tåle å kjøre under en understi: lenker, delingslenker og Google-tilkoblingen må testes.

*Ferdig når:* Brukerne lander på startsiden, Desk ligger under `/desk` og Planner under `/planner`. Lav risiko.

### Fase 2: Felles innlogging

- Desk tar i bruk Supabase Auth-prosjektet til Sign og Planner.
- `DashboardUser` kobles til Supabase-brukere på e-post. Brukere som ikke finnes der, opprettes og får en «sett passord»-e-post.
- Desk sine egne økter (`DashboardSession`) erstattes av Supabase-økter. Tilgangene (`isInternal`, `ProjectMembership`) beholdes uendret.
- Prosjektinvitasjoner i Desk går gjennom Supabase.

*Ferdig når:* Én konto og ett passord for alle tre. Desk, Sign og Planner på samme domene deler også innloggingsøkt. Middels risiko: test innlogging, glemt passord og invitasjoner grundig på staging.

### Fase 3: Felles kjerne (det største steget)

- **Måldatabase:** Sign sin Neon-database, siden den allerede har kjernemodellen og flest tabeller. Desk sine tabeller flyttes inn.
- **Skjema:** Kjernen utvides med det Desk har (personfeltene, sats, roller, notater) og med `ProjectAccessGrant` og `Project.modules`.
- **Migreringsskript,** kjørt på staging til de er riktige:
  - `Customer` og `Agency` blir til `Company`, slått sammen på organisasjonsnummer eller navn.
  - Personer slås sammen på e-post og telefon. Usikre treff havner på en liste for manuell gjennomgang, og ingenting slås sammen automatisk ved tvil.
  - Prosjekter slås sammen på prosjektnummer, med gjennomgangsliste for det som ikke matcher.
  - `ProjectCrew` blir til `ProjectMember`, og `Engagement` kobles på der samme person og rolle finnes.
- **Gamle ID-er:** En tabell over gamle ID-er beholdes, så gamle lenker til prosjekter, dagsplaner og delte crewlister kan videresendes. Desk bruker cuid og Sign UUID.
- **Overgang:** Desk-modulen leser og skriver mot den nye kjernen. Den gamle Desk-databasen settes i skrivebeskyttet modus og beholdes en periode.

*Ferdig når:* Desk og Sign viser de samme prosjektene og personene. Høy risiko: kjøres bare etter at fase 0 er på plass, med en øvelse på staging og et avtalt tidsvindu.

### Fase 4: Sign som modul

- Koden fra `aparent_contracts` flyttes inn under `/sign`. Den har allerede samme Next- og Prisma-versjon etter fase 1.
- Bygg med Turbopack i stedet for webpack, eller finn ut hvorfor Sign trenger webpack.
- `wrapup-sign.vercel.app` videresendes. Lenker til signering som allerede er sendt til mottakere må fortsatt virke, så de gamle stiene videresendes og testes spesielt.

*Ferdig når:* Sign kjører i vertsappen, og alle sendte signeringslenker virker.

### Fase 5: Felles prosjektopprettelse og koblinger

- Skjemaet fra avsnitt 5 erstatter de to separate «Nytt prosjekt»-skjemaene i Desk og Sign.
- Første kobling på tvers: crew til kontrakt.
- Prosjektsiden viser status fra modulene.

### Fase 6: Opprydding

- De gamle Vercel-prosjektene for Desk og Sign står som rene videresendinger i en periode, og slås så av. Planner sitt Vercel-prosjekt blir stående, siden det er Planner-appen.
- Gamle databaser og Desk sitt Supabase-prosjekt (`cfnieu…`) arkiveres og slettes etter avtalt tid.

## 8. Risiko og hvordan vi tar den ned

| Risiko | Tiltak |
|---|---|
| Feil sammenslåing av personer eller prosjekter | Sammenslåing bare ved sikre treff, manuell liste for resten, øvelse på staging, og gamle databaser beholdes |
| Signeringslenker og delte lenker slutter å virke | Tabell over gamle ID-er og videresendinger, med egne tester for sendte lenker |
| Sensitive persondata (kontonummer, fødselsnummer) | Samme kryptering og nøkkel, samme tilgangsregler, revisjon av hvem som kan se hva i ny tilgangsmodell |
| En feil i én modul stopper alle | Pull request med preview og tester, og moduler kan skjules bak flagg ved feil |
| Lang tid der to systemer lever side om side | Hver fase er liten og ferdig for seg, ingen fase etterlater halvveis flyttet data |
| Lokal utvikling mot produksjon | Fikses i fase 0 |
| Planner virker ikke under `/planner` | Testes på staging før domenet tas i bruk, og Planner beholder sin egen adresse som reserve |

## Status

### Fase 0 (påbegynt 2026-11-09)

- **Utviklingsdatabase for Desk:** Neon-grenen `development` (`br-late-morning-agkmmcw6`) i prosjektet `aparent-dashboard` er en kopi av produksjon. Lokal `.env` peker nå dit, og produksjonsverdiene ligger kommentert ut. Lokal utvikling av Desk skriver ikke lenger til produksjon.
- **Telling, Desk:** 8 prosjekter (7 med prosjektnummer), 56 personer, 7 kunder, 5 byråer, 74 crew-koblinger, 15 dagsplaner, 8 lønningslister, 3 brukere (2 interne) og 1 ekstern prosjekttilgang.
- **Telling, Sign:** 39 organisasjoner, 176 brukere, 61 prosjekter, 32 firmaer, 68 personer, 27 engasjementer, 107 kontrakter og 49 signaturer. Det meste er **testdata i produksjon**, blant annet rundt 30 organisasjoner med navn som «Dashboard v1 verify …» og «Users verify …». De ekte er «Aparent AS» (12 prosjekter, 20 kontrakter), en andre «Aparent AS» (1 prosjekt, 7 kontrakter) og «Lasse AS» (3 prosjekter, 16 kontrakter).
- **Konsekvens:** Datamengden er liten, så sammenslåingen i fase 3 blir håndterbar. Før fase 3 må testdataen i Sign ryddes bort, og de to «Aparent AS» må slås sammen eller avklares. Sign har skriptet `clean:review-data` som kan være et utgangspunkt. Sign trenger også egen utviklingsgren, så tester ikke kjører mot produksjon.
- **Postgres-versjon:** Sign bruker 18 og Desk 17. Måldatabasen i fase 3 blir Sign sin, altså 18.
- **Gjenstår:** Utviklingsgren for Sign, preview-database per pull request og rydding av testdata i Sign.

### Fase 1 (påbegynt 2026-11-09)

- Startsiden ligger på `/`, med ikoner for desk, sign og planner og samme overgang som tjenestevelgeren.
- Desk er flyttet til `/desk`. Gamle adresser (`/projects/…`, `/crew`, `/kunder`, `/byra`, `/brukertilgang`, `/dagsplaner/…`, `/callsheets/…`, `/design/…`) videresendes permanent.
- Tjenestevelgeren har fått «Alle apper», som går til startsiden.
- **Gjenstår:** Oppgradering til Next.js 16.3 og Prisma 7, felles designmappe, domenet `wrapup.aparent.tv` og Planner under `/planner`.

## 9. Beslutninger som trengs

Avklart 2026-11-09:

1. **Domenet:** `wrapup.aparent.tv`. Det er ikke opprettet ennå, det gjør Lasse.
2. **Organisasjoner:** Bare Aparent nå, men andre selskaper på sikt. Skillet på `organizationId` fra Sign beholdes derfor i kjernen.
3. **Planners farge:** Blåkopi `#2b4c7e`, slik den allerede er i `wrapup-planner`.

## 10. Forholdet til SSO-forslaget

`docs/sso-desk-sign.md` løser innlogging mellom separate apper. Med denne planen blir det overflødig. Fase 2 gir felles innlogging direkte. Etter fase 4 er Desk og Sign én app, og Planner deler økt med dem via samme domene.

## Det jeg ikke har sjekket

- Antall rader i noen av databasene. Jeg har ikke koblet meg til noen database, og tellingen er en del av fase 0.
- Hvordan Sign sin kode håndhever skillet mellom organisasjoner i praksis. Det ser ut til å skje i koden, siden det ikke finnes database-policyer i Sign sine migreringer.
- Planner sin kode utover databaseskjema og README, inkludert om den tåler å kjøre under `/planner`.
