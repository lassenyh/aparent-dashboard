# WrapUp Desk: invitasjoner og oppsett

Administrator: `lasse@aparent.tv`. Admin bruker `isInternal=true` i appens
DashboardUser-modell og har tilgang til alle prosjekter. Ingen e-postadresse
hardkodes som et unntak i tilgangskontrollen.

## 1. Resend

1. Resend → Domains → Add domain → `aparent.tv`.
2. Velg en tilgjengelig europeisk region om ønskelig.
3. Legg DNS-postene Resend viser inn hos DNS-leverandøren. Bruk nøyaktig navn,
   type og verdi fra Resend; ikke erstatt eksisterende MX-poster for vanlig e-post.
   Aktiver sending, ikke mottak av e-post.
4. Velg Verify DNS Records. Vent til domenet er Verified.
5. API Keys → Create API Key → navn `WrapUp Desk`, permission `Sending access`,
   domain `aparent.tv`. Kopier nøkkelen til Vercel, ikke til chat eller Git.
6. Avsenderen kan være `WrapUp Desk <invite@aparent.tv>`.
   Resend trenger ikke en separat postkasse for å sende fra denne adressen.

Dokumentasjon: https://resend.com/docs/dashboard/domains/introduction

## 2. Vercel

Åpne prosjektet `aparent-dashboard` → Settings → Environment Variables.
Legg inn verdiene for Production. Bruk ikke ekstra anførselstegn i Vercel-feltene.

| Navn | Eksempel / kilde |
| --- | --- |
| RESEND_API_KEY | re_... fra Resend; marker som sensitiv |
| RESEND_FROM_EMAIL | WrapUp Desk <invite@aparent.tv> |
| NEXT_PUBLIC_APP_URL | https://APPENS-FAKTISKE-PRODUKSJONSDOMENE |
| SUPABASE_SERVICE_ROLE_KEY | servernøkkel fra samme Supabase-prosjekt som URL-en; marker som sensitiv |
| NEXT_PUBLIC_SUPABASE_URL | eksisterende Supabase-prosjekt-URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eksisterende offentlig Supabase-nøkkel |

Bruk samme Supabase-prosjekt for de tre Supabase-verdiene. Den hemmelige
servernøkkelen må aldri ha NEXT_PUBLIC_-prefiks. Innlogging med e-post/passord
må være aktivert i Supabase Authentication → Sign In / Providers → Email.
Resend sender invitasjonene direkte, så denne invitasjonsflyten trenger ikke
Supabase SMTP. Eventuell passordgjenoppretting via Supabase må konfigureres separat.

Når variablene er lagret må appen deployes på nytt. Siden Brukertilgang →
Inviter til prosjekt viser hvilke innstillinger som mangler og blokkerer sending.
En komplett liste med variabler bekrefter ikke domeneverifisering eller nøkkelens
rettigheter; kontroller første sending i Resend → Emails.

## 3. Bruk

1. Logg inn som admin → Brukertilgang → Inviter til prosjekt.
2. Velg én e-postadresse, ett prosjekt og rettigheter per modul.
3. Kontroller e-postforhåndsvisningen og send.
4. Mottakeren åpner lenken, oppretter konto eller logger inn og godtar.
5. Kontoen får et medlemskap i akkurat dette prosjektet. Nye brukere opprettes i
   Supabase Auth ved registrering, og kobles til DashboardUser med Supabase-ID.
   Eksisterende lokale kontoer kan logge inn med sitt opprinnelige brukernavn.
6. Endre rettigheter i prosjektets Tilgang-fane. Fjern tilgang eller trekk tilbake
   invitasjonen fra invitasjonsoversikten. En ny sending erstatter forrige lenke.

## Sikkerhet og drift

- Tilgang håndheves på serveren for hvert prosjekt og hver modul.
- Konto er separat fra prosjektmedlemskap; registrering alene gir ingen prosjekter.
- Invitasjoner har 256-bit tilfeldige tokens, hashes i databasen og utløper etter 7 dager.
- Aksept og opprettelse av medlemskap skjer i én databasetransaksjon.
- Tilbakekalling fjerner tilgangen selv om aksept skjer samtidig.
- Innloggingssesjoner er tilfeldige tokens med databasevalidering og 7 dagers utløp.
  Gamle cookies med bruker-ID blir ugyldige ved deploy: eksisterende brukere logger inn igjen.
- Invitasjonslenker indekseres ikke og sender ingen Referer-header videre.
- E-post/passordinnlogging og invitasjonsforsøk har delte databasebaserte grenser.
- Utløpte rader i dashboard_sessions og auth_rate_limits kan slettes regelmessig.
- Invitasjons- og sesjonstabellene brukes bare fra serveren, ikke fra Supabase Data API.
- Ingen faktiske invitasjoner sendes under automatiske tester.

## Deploy

Kjør tester og bygg. Migrer databasen med `prisma migrate deploy` før den nye
applikasjonsversjonen settes i produksjon. Migrasjonen er additiv og sletter
ikke eksisterende brukere, prosjekter eller rettigheter.

Inviterte uten rettigheten for sensitive personopplysninger får en begrenset
lønningsvisning. Med skriverett kan de endre honorarer på eksisterende rader;
person-/kontonummer og opprettelse av komplette lønnsrader forvaltes av admin.
Lesevisning av dagsplaner og call sheets bruker dokumentvisningen uten redigeringskontroller.

## Verifikasjon

- `node --conditions react-server --import tsx --test tests/project-invitations.test.ts tests/invitation-delivery.test.ts`
- Integrasjonstesten er opt-in med `RUN_INVITATION_DB_TESTS=1` og gyldig DATABASE_URL/DIRECT_URL.
  Den oppretter isolerte testbrukere og prosjekter som fjernes i `finally`.
- Nettleserkontroll: adminskjema, mottakeraksept, prosjektavgrensning, lesevisning,
  tilbakekalling, avvisning av gamle bruker-ID-cookies, e-postinnlogging og utlogging.
- Endelig e-postlevering og ny Supabase-registrering må prøves når servernøklene
  er konfigurert. En vellykket Resend API-respons betyr akseptert sending; faktisk
  levering kontrolleres i Resend → Emails.

## Direkte invitasjoner fra Supabase

Supabase Auth-prosjektet for WrapUp er `cfnieutmxpoiafhiglsd`. URL, offentlig nøkkel og servernøkkel må tilhøre samme prosjekt. Produksjonens Site URL i Supabase Authentication → URL Configuration er `https://aparent-dashboard.vercel.app/auth/complete`.

Denne siden tar imot Supabase sine invite/recovery-lenker og lar brukeren velge passord. Token fjernes fra adressefeltet og verifiseres på server før passordet endres. Brukeren må allerede være koblet til en aktiv WrapUp-profil via Supabase Auth-ID. Lasse er koblet eksplisitt til sin eksisterende adminprofil. Andre bidragsytere inviteres fra WrapUp → Brukertilgang, slik at profil og prosjektavgrensning opprettes sammen. Ingen automatisk adminrettighet gis basert på e-post eller brukerredigerbare metadata.

Hvis en gammel invitasjon allerede er brukt: åpne brukeren under Supabase Authentication → Users og send en passordtilbakestilling. Den nye lenken bruker riktig produksjonsadresse. Supabase-dashboardets eget innloggingspassord er uavhengig av WrapUp-passordet.
