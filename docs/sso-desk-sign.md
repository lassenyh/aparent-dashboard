# Felles innlogging (SSO) mellom WrapUp Desk og WrapUp Sign

Status: forslag, ikke implementert. Skrevet 2026-11-09.

**Mål:** Når en innlogget Desk-bruker velger «Sign» i tjenestevelgeren i logoen
(`src/components/service-switcher.tsx`), skal Sign åpne seg innlogget, uten
innloggingssiden.

## 1. Slik fungerer innloggingen i dag

### Desk (`aparent-dashboard`, aparent-dashboard.vercel.app)

- **Sesjonen er Desks egen, ikke Supabase sin.** Ved innlogging lages et tilfeldig
  token på 32 byte. SHA-256 av tokenet lagres i `DashboardSession` (Neon), og
  selve tokenet ligger i cookien `aparent_auth`. Cookien er HttpOnly,
  `SameSite=Lax`, gjelder bare verten (ingen `Domain`) og varer i 7 dager
  (`src/lib/auth-session.ts`, `src/lib/auth-cookie.ts`, `src/lib/auth-token.ts`).
- `src/proxy.ts` sjekker bare at cookien finnes. Den ekte sjekken gjøres av
  `getSessionDashboardUser()`, som slår opp i `DashboardSession` og krever
  `user.isActive`.
- **Supabase (prosjekt `cfnieu…`) brukes bare til å bekrefte passord:**
  - Inviterte brukere har `DashboardUser.supabaseAuthId`. Innlogging skjer med
    e-post og `signInWithPassword`, og e-posten må være bekreftet
    (`src/app/api/auth/login/route.ts`). Invitasjonene opprettes med
    `auth.admin.createUser({ email_confirm: true })` (`src/actions/project-invitations.ts`).
  - Eldre brukere logger inn med brukernavn og passord mot `passwordHash` i Neon.
    Den aller eldste gruppen går mot Supabase-tabellen `project_logins` og flyttes
    over ved første innlogging. **Disse brukerne har ofte ingen e-post, eller en
    e-post som aldri er bekreftet.**
- Utlogging sletter `DashboardSession`-raden og cookien. Ingen Supabase-sesjon
  ligger i nettleseren.

### Sign (`aparent_contracts`, wrapup-sign.vercel.app)

- **Helt standard `@supabase/ssr`** mot Supabase-prosjektet `xpjkng…`. Sesjonen
  ligger i Supabase-cookiene (`sb-xpjkng…-auth-token`) på Signs vert.
  `src/lib/supabase/proxy.ts` fornyer sesjonen med `getClaims()` og sender
  brukere uten gyldige claims til `/login?next=…`.
- Innlogging bruker e-post og passord med `signInWithPassword`
  (`src/app/(auth)/login/actions.ts`). **Hvem som helst kan registrere seg**
  (`signUp`, med e-postbekreftelse via `/auth/confirm`, som allerede tar imot
  `token_hash` + `type` og kaller `verifyOtp`).
- Etter innlogging lager eller oppdaterer `ensureApplicationUserAccessRecord`
  brukerens `User`-rad ut fra `supabaseAuthId` og e-post, og tar i bruk ventende
  `OrganizationInvite` for samme e-post (`src/features/users/auth-sync-core.ts`).
  `resolvePostAuthPath` sender så brukeren til `/dashboard`, `/setup` eller
  `/unauthorized`.
- **Sign bruker Supabase bare til Auth.** Den har ingen tabeller, storage eller
  RLS mot Supabase. Alle data ligger i Signs egen Neon-database, med
  `User.supabaseAuthId` som eneste kobling.
- Sign har allerede en service role-klient (`src/lib/supabase/admin.ts`).

### Hvorfor Sign viser innloggingssiden

1. Hver app har sitt eget Supabase-prosjekt. Brukerne er to separate kontoer som
   tilfeldigvis kan ha samme e-post.
2. `vercel.app` står på Public Suffix List. Det går derfor ikke an å sette en
   cookie som både `aparent-dashboard.vercel.app` og `wrapup-sign.vercel.app` ser.
3. Desks cookie kan bare kontrolleres mot Desks egen database, så Sign kunne
   uansett ikke lest den.

Felles domene alene løser altså ikke punkt 1 og 3, og felles Supabase-prosjekt
alene løser ikke punkt 2. Den eneste løsningen som fungerer på dagens domener er
en overlevering ved klikk.

---

## 2. Alternativer

### A. Overlevering ved klikk med signert engangsbevis (anbefalt nå)

**Flyt:**

1. Brukeren velger Sign. Desk sender et `POST /api/auth/handoff/sign` (samme
   origin, CSRF-sjekk som i dag).
2. Desk-serveren sjekker sesjonen og lager et kortlivet bevis: en JWT signert med
   EdDSA (Ed25519), med disse feltene:
   `iss=wrapup-desk`, `aud=wrapup-sign`, `sub=<DashboardUser.id>`,
   `email=<bekreftet e-post>`, `name`, `jti=<tilfeldig>`, `exp=now+60s`.
3. Nettleseren leveres videre til Sign med et skjema som sender seg selv
   (`POST https://wrapup-sign…/auth/handoff`, beviset i body). Beviset havner
   ikke i URL, historikk, logger eller Referer. Overgangsanimasjonen kan spille
   mens dette skjer.
4. Sign kontrollerer signaturen med Desks **offentlige** nøkkel, sjekker
   `aud`/`iss`/`exp` og at `jti` ikke er brukt før. Deretter lager Sign selv en
   vanlig Supabase-sesjon i sitt eget prosjekt:
   `admin.generateLink({ type: "magiclink", email })` gir `hashed_token`, og
   `verifyOtp({ type: "email", token_hash })` kjøres via SSR-klienten, som setter
   Signs vanlige cookies. Til slutt kjører Sign den vanlige
   `syncUserAccessFromAuth` og `resolvePostAuthPath`, og svarer med 303 til
   målsiden.

**Endringer i Desk:**

- Ny route `src/app/api/auth/handoff/sign/route.ts` som krever sesjon og signerer
  beviset. Ny avhengighet: `jose`.
- Ny hemmelig miljøvariabel `WRAPUP_HANDOFF_PRIVATE_KEY` (Ed25519, PKCS8).
- `service-switcher.tsx`: `go()` skal sende skjemaet (eller hente beviset og
  sende skjemaet) i stedet for `location.assign(url)`. Cmd-klikk kan fortsatt
  åpne Sign uten overlevering.
- Overlevering tilbys bare når `DashboardUser.supabaseAuthId` finnes. Bare da vet
  vi at e-posten er bekreftet. Eldre brukere med bare brukernavn sendes til Signs
  innloggingsside som i dag.

**Endringer i Sign:**

- Ny route `src/app/auth/handoff/route.ts` (POST). Proxyen slipper den allerede
  gjennom, siden den matcher `/auth`. Ny avhengighet: `jose`.
- Ny miljøvariabel `WRAPUP_HANDOFF_PUBLIC_KEY`. Den er ikke hemmelig.
- Engangsbruk av `jti`: ny tabell `AuthHandoffNonce (jti PK, expiresAt)`. Dette
  krever en Prisma-migrering, men den kjøres ikke nå.
- Regler for brukeren:
  - **Finnes i Sign med bekreftet e-post:** logg inn.
  - **Finnes, men e-posten er ikke bekreftet: avvis** og send til `/login`.
    Ellers kan noen som har registrert seg i Sign med en annens e-post og et
    passord de kjenner, overta kontoen så snart overleveringen bekrefter
    e-posten.
  - **Finnes ikke:** opprett med `admin.createUser({ email, email_confirm: true,
    user_metadata: { full_name } })`. Brukeren havner da på `/setup` eller får
    ventende invitasjoner via den eksisterende synkroniseringen. (Dette er en
    policybeslutning. Alternativet er å sende til `/register`.)
- Eventuelt rate limit per e-post, med samme mønster som Desks `allowAuthAttempt`.

**Migrering av brukere:** ingen. Brukerne kobles på e-post ved hvert klikk.
Passordene forblir separate.

**Risiko:**

- Kobling på e-post betyr at Sign stoler på at Desk har bekreftet e-posten.
  Derfor gjelder overleveringen bare brukere med `supabaseAuthId`.
- Den private nøkkelen i Desk blir en «logg inn som hvem som helst i Sign»-nøkkel.
  Den skal bare ligge i Vercel-miljøet for Production og Preview, og det må finnes
  en plan for å bytte den.
- Utlogging er ikke felles. Logger man ut av Desk, er man fortsatt innlogget i
  Sign, og omvendt. Det er som regel greit, men bør nevnes for brukerne.
- Bare én retning (Desk → Sign). Sign → Desk kan bygges likt senere, med en egen
  nøkkel.
- Moderat kodemengde: omtrent 150 linjer fordelt på to apper. Ingen endring i
  Desks sesjonsmodell.

> **Forkastet variant:** å la Desk få Signs `SUPABASE_SERVICE_ROLE_KEY` og lage
> magic-linken direkte. Det er mindre kode, men da gir et innbrudd i Desk full
> admin-tilgang til Signs Auth. Med A får Desk bare en nøkkel som Sign selv
> avgjør hva den skal godta.

---

### B. Felles domene under aparent.tv og delt cookie

For eksempel `desk.wrapup.aparent.tv` og `sign.wrapup.aparent.tv`, med cookies
satt med `Domain=.wrapup.aparent.tv`. Et eget underdomene er bedre enn
`.aparent.tv`, så ikke alle andre aparent.tv-sider får tilsendt cookien.

For at Sign skal kunne *lese* en delt cookie trengs også én av disse:

- **B1 + felles Supabase (C):** begge bruker `@supabase/ssr` med
  `cookieOptions.domain`. Dette er ekte SSO, med felles utlogging.
- **B2 + introspeksjon:** Desks `aparent_auth` får `Domain=…`, og Sign spør Desk
  (`/api/auth/introspect`) ved hvert besøk. Det gir ekstra ventetid mellom apper
  og regioner, og Sign blir avhengig av at Desk er oppe. Ikke anbefalt.

**Endringer:**

- **DNS og Vercel:** egne domener på begge prosjektene. Supabase Site URL og
  Redirect URLs må oppdateres i begge prosjektene. `NEXT_PUBLIC_WRAPUP_SIGN_URL`
  og `NEXT_PUBLIC_APP_URL` må endres.
- **Desk:** bytte `aparent_auth`-sesjonen ut med Supabase SSR-sesjon (B1). Det er
  en stor endring, fordi eldre brukere med bare brukernavn ikke har noen
  Supabase-konto.
- **Sign:** `domain` i cookie-opsjonene i `server.ts`, `proxy.ts` og `client.ts`.
- Gamle `*.vercel.app`-adresser må sende videre (308) til de nye domenene.

**Migrering:** alle får nye cookies, og alle må logge inn én gang etter byttet.
Uten felles Supabase-prosjekt løser ikke B noe alene.

**Risiko:** DNS-tilgang til aparent.tv. Cookien er synlig for alle underdomener i
`Domain`. En XSS-feil i én app kan da i praksis stjele sesjonen til begge. Vi
mister også isolasjonen mellom Preview-deployer.

---

### C. Felles Supabase-prosjekt

Begge apper peker på ett Supabase-prosjekt. Den naturlige kandidaten er Desks
`cfnieu…`, siden Desk også har `project_logins` der. Alternativt Signs
`xpjkng…`, som bare har Auth og dermed er det enkleste å flytte *fra*.

**Endringer:**

- **Sign:** nye `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  og `SUPABASE_SERVICE_ROLE_KEY`. E-postmalene i Supabase må bruke
  `token_hash`-lenker til riktig app. Det felles prosjektet har bare én Site URL,
  så malene må peke på `{{ .RedirectTo }}`, og begge appenes adresser må stå i
  listen over tillatte Redirect URLs.
- **Desk:** ingen kodeendring for å kontrollere passord. For SSO må C kombineres
  med A eller B.

**Migrering av brukere** (den største jobben):

- Kopiere Signs `auth.users` og `auth.identities` til det felles prosjektet,
  med samme `id` og `encrypted_password` (bcrypt), via SQL mot Supabase-databasen.
  Da beholder Signs `User.supabaseAuthId` gyldigheten og ingen trenger nytt
  passord.
- **E-postkollisjoner:** når samme e-post finnes i begge prosjektene med ulik
  `id`, må én konto vinne. Den andre appens `supabaseAuthId` må skrives om på
  e-post (`DashboardUser.supabaseAuthId` eller `User.supabaseAuthId`), og brukeren
  må velge passord på nytt. Antallet må telles før man bestemmer seg.
- Uten SQL-kopi må alle Sign-brukere sette nytt passord, og `User.supabaseAuthId`
  må mappes om på e-post.

**Risiko:** innloggingsflyten i produksjon er nede eller inkonsistent mens
migreringen pågår. Én enkelt konfigurasjon (SMTP, maler, rate limits) for to
produkter. Selvregistrering i Sign havner i samme brukerbase som Desks
invitasjonsbaserte brukere. Det er ufarlig, siden Desk krever en `DashboardUser`,
men bør være et bevisst valg.

**Gevinst:** én konto og ett passord per person. Kombinert med A blir
overleveringen enklere: Sign trenger bare `generateLink` og `verifyOtp` på samme
bruker. Kombinert med B blir det ekte SSO med felles utlogging.

---

## 3. Sammenligning

|                                  | A: overlevering        | B: felles domene                 | C: felles Supabase    |
| -------------------------------- | ---------------------- | -------------------------------- | --------------------- |
| Løser Desk → Sign alene          | **Ja**                 | Nei (krever C eller introspeksjon) | Nei (krever A eller B) |
| Fungerer på dagens `*.vercel.app` | **Ja**                 | Nei                              | Ja, men uten SSO      |
| Migrering av brukere             | Ingen                  | Én ny innlogging for alle        | Kopi av Auth-brukere og løsing av kollisjoner |
| DB-migrering                     | 1 liten tabell i Sign  | Ingen                            | SQL på `auth.*`       |
| Felles passord og utlogging      | Nei                    | Med C: ja                        | Felles passord        |
| Omfang                           | Lite                   | Middels til stort                | Stort                 |

## 4. Anbefaling

**Bygg A nå.** Det er den eneste løsningen som fjerner innloggingssiden på dagens
domener. Den krever ingen brukermigrering og lar Desks sesjonsmodell og
eldre brukere være som de er. Endringene holder seg innenfor én route i hver app,
pluss tjenestevelgeren. Sign beholder kontrollen over hvem som slipper inn: den
godtar bare signerte, kortlivede engangsbevis for bekreftede e-poster, og avviser
ubekreftede Sign-kontoer.

**Senere, hvis WrapUp får eget domene og flere tjenester (Rights, Payroll):**
gå over til C + B, altså ett Supabase-prosjekt og Supabase-cookies på
`.wrapup.aparent.tv` (eller tilsvarende). Gjør det samtidig som de eldre
brukerne med bare brukernavn er flyttet over til Supabase Auth. A kan da fjernes
eller beholdes som reserve for Preview-deployer.

### Beslutninger som trengs før A bygges

1. Skal en Desk-bruker uten Sign-konto få konto automatisk (og havne på
   `/setup`), eller sendes til `/register`?
2. Skal overleveringen også gå andre veien (Sign → Desk)?
3. Hvor skal nøkkelparet lages og lagres? Forslag: én nøkkel per miljø, der
   Preview og Production har hver sin.

### Rekkefølge for A (ingenting er gjort)

1. Generer Ed25519-nøkkelpar. Legg den private nøkkelen i Desk og den offentlige
   i Sign (Vercel-miljø).
2. Sign: migrering for `AuthHandoffNonce`, `/auth/handoff`-route, tester for
   avvisning (utløpt, feil `aud`, gjenbrukt `jti`, ubekreftet e-post).
3. Desk: `/api/auth/handoff/sign` og skjemainnsending i `ServiceSwitcher`.
4. Test ende-til-ende på Preview-deployer mot en egen Neon-branch og et
   Supabase-testprosjekt. **Ikke** mot produksjonsdatabasen, som Desks lokale
   dev deler.
