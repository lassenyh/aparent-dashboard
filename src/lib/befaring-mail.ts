/**
 * Teknisk befaring — faste rollelister og mailmal.
 * Rene funksjoner (ingen server-avhengigheter) slik at klienten kan generere forhåndsvisning live.
 */

export type BefaringRoleGroup = "standard" | "optional";

type RoleRule = {
  key: string;
  label: string;
  group: BefaringRoleGroup;
  match: (t: string) => boolean;
};

export function normalizeRole(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[_./]+/g, " ")
    .replace(/\s+/g, " ");
}

const has = (t: string, re: RegExp) => re.test(t);

/** Rekkefølgen her styrer rekkefølgen i mottakerlisten. Første treff vinner. */
export const BEFARING_ROLE_RULES: RoleRule[] = [
  {
    key: "executive-producer",
    label: "Executive Produsent",
    group: "standard",
    match: (t) => has(t, /\bexec(utive)?\b/) && has(t, /produ/),
  },
  {
    key: "line-producer",
    label: "Linjeprodusent",
    group: "standard",
    match: (t) => has(t, /linje ?-?produsent/) || has(t, /\bline ?-?producer\b/),
  },
  {
    key: "producer",
    label: "Produsent",
    group: "standard",
    match: (t) =>
      (has(t, /produsent/) || has(t, /\bproducer\b/)) &&
      !has(t, /assistent|assistant|\bpa\b/),
  },
  {
    key: "dop",
    label: "DOP/Fotograf",
    group: "standard",
    match: (t) =>
      !has(t, /\bb ?-?foto|still|assistent|assistant|\bac\b/) &&
      (t === "foto" ||
        has(t, /fotograf/) ||
        has(t, /\bdop\b|\bdp\b/) ||
        has(t, /director of photography|cinematographer/)),
  },
  {
    key: "director-assistant",
    label: "Regi-Assistent",
    group: "standard",
    match: (t) =>
      has(t, /regi ?-?assistent/) || has(t, /director'?s? assistant|assistant to (the )?director/),
  },
  {
    key: "director",
    label: "Regissør",
    group: "standard",
    match: (t) =>
      has(t, /regissor/) ||
      (has(t, /\bdirector\b/) && !has(t, /photography|assistant|art director|creative director|\bad\b/)),
  },
  {
    key: "production-manager",
    label: "Produksjonsleder",
    group: "standard",
    match: (t) => has(t, /produksjonsleder/) || has(t, /\bprod(uction)? ?manager\b/),
  },
  {
    key: "coordinator",
    label: "Koordinator",
    group: "standard",
    match: (t) => has(t, /koordinator|coordinator/) && !has(t, /stunt/),
  },
  {
    key: "first-ad",
    label: "Innspillingsleder",
    group: "standard",
    match: (t) =>
      has(t, /innspillingsleder/) || has(t, /\b(1st|first|1\.?) ?ad\b/) || has(t, /first assistant director/),
  },
  {
    key: "gaffer",
    label: "Lysmester",
    group: "standard",
    match: (t) => has(t, /lysmester|\bgaffer\b/),
  },
  {
    key: "location-manager",
    label: "Locationmanager",
    group: "standard",
    match: (t) =>
      has(t, /location ?-?manager|lokasjonsansvarlig|locationansvarlig|lokasjonssjef/),
  },
  {
    key: "grip",
    label: "Grip",
    group: "optional",
    match: (t) => has(t, /\bgrip\b|\bgrips\b|\bgripsjef\b/),
  },
  {
    key: "stunt",
    label: "Stuntansvarlig",
    group: "optional",
    match: (t) => has(t, /stunt/),
  },
];

export function matchBefaringRole(role: string): RoleRule | null {
  const t = normalizeRole(role);
  if (!t) return null;
  return BEFARING_ROLE_RULES.find((rule) => rule.match(t)) ?? null;
}

export function befaringRoleRank(key: string): number {
  const i = BEFARING_ROLE_RULES.findIndex((r) => r.key === key);
  return i < 0 ? 999 : i;
}

export type BefaringRecipient = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  ruleKey: string;
  ruleLabel: string;
  group: BefaringRoleGroup;
};

export type BefaringLocation = {
  id: string;
  name: string;
  address: string;
  mapsUrl: string | null;
};

export type BefaringLocationOption = BefaringLocation & {
  /** Dagsplan-tittel lokasjonen kom fra (tom for manuelle). */
  source: string;
  defaultIncluded: boolean;
};

export type BefaringCrewOption = BefaringRecipient & { matched: boolean };

export type BefaringMailInput = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM eller tom */
  time: string;
  projectLabel: string;
  transport: string;
  locations: BefaringLocation[];
  closing: string;
  /** Dagens dato (YYYY-MM-DD) for «i dag» / «i morgen». */
  today: string;
};

const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
const MONTHS = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function dayDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** «10. november» */
export function formatDayMonth(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return "";
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
}

/** «tirsdag 10. november» */
export function formatWeekdayDayMonth(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return "";
  return `${WEEKDAYS[d.getUTCDay()]} ${formatDayMonth(iso)}`;
}

/** Innledende tidsangivelse: «I morgen, 10. november,» / «I dag, …,» / «Tirsdag 10. november». */
function whenPhrase(date: string, today: string): string {
  const d = parseIsoDate(date);
  const t = parseIsoDate(today);
  if (!d) return "";
  const diff = t ? dayDiff(d, t) : NaN;
  if (diff === 0) return `I dag, ${formatDayMonth(date)},`;
  if (diff === 1) return `I morgen, ${formatDayMonth(date)},`;
  return capitalize(formatWeekdayDayMonth(date));
}

export function buildBefaringSubject(input: Pick<BefaringMailInput, "date" | "projectLabel">): string {
  const when = formatWeekdayDayMonth(input.date);
  return ["Teknisk befaring", input.projectLabel, when].filter(Boolean).join(" – ");
}

export function locationLine(loc: BefaringLocation): string {
  const name = loc.name.trim();
  const address = loc.address.trim();
  if (name && address && !address.toLowerCase().startsWith(name.toLowerCase())) {
    return `${name}: ${address}`;
  }
  return address || name;
}

function usableLocations(locations: BefaringLocation[]) {
  return locations.filter((l) => l.name.trim() || l.address.trim());
}

function introLine(input: BefaringMailInput): string {
  const when = whenPhrase(input.date, input.today);
  const subject = input.projectLabel || "prosjektet";
  if (!when) return `Det er teknisk befaring for ${subject}.`;
  return `${when} er det teknisk befaring for ${subject}.`;
}

export type BefaringMailLine =
  | { kind: "text"; text: string }
  | { kind: "location"; index: number; text: string; mapsUrl: string | null }
  /** Linje med uthevet tittel, f.eks. «Oppmøte:» */
  | { kind: "field"; label: string; text: string };

/** Felles linjestruktur for ren tekst, HTML og forhåndsvisning. Tom tekst = blank linje. */
export function buildBefaringLines(input: BefaringMailInput): BefaringMailLine[] {
  const t = (text: string): BefaringMailLine => ({ kind: "text", text });
  const out: BefaringMailLine[] = [t("Hei dere,"), t(""), t(introLine(input))];
  const locs = usableLocations(input.locations);
  if (locs.length) {
    out.push(t(""));
    locs.forEach((loc, i) =>
      out.push({ kind: "location", index: i + 1, text: locationLine(loc), mapsUrl: loc.mapsUrl }),
    );
  }
  const time = input.time.trim();
  /* Rett under lokasjonene; egen blokk bare når det ikke finnes lokasjoner. */
  if (time) {
    if (!locs.length) out.push(t(""));
    out.push({ kind: "field", label: "Oppmøte:", text: `Kl ${time}` });
  }
  const transport = input.transport.trim();
  if (transport) {
    out.push(t(""), { kind: "field", label: "Transport:", text: "" });
    out.push(...transport.split("\n").map((l) => t(l.trimEnd())));
  }
  const closing = input.closing.trim();
  if (closing) out.push(t(""), ...closing.split("\n").map((l) => t(l.trimEnd())));
  return out;
}

/** Ren tekst — brukes i mailto: (Mail viser lenker som klikkbare URL-er). */
export function buildBefaringBodyText(input: BefaringMailInput): string {
  return buildBefaringLines(input)
    .map((line) =>
      line.kind === "text"
        ? line.text
        : line.kind === "field"
          ? `${line.label} ${line.text}`.trimEnd()
          : `Location ${line.index}: ${line.text}${line.mapsUrl ? ` (Google Maps: ${line.mapsUrl})` : ""}`,
    )
    .join("\n");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mails standardfont, satt på hver linje så Mail ikke faller tilbake til nettleserens 16px. */
const MAIL_FONT_STYLE = "font-family: Helvetica, Arial, sans-serif; font-size: 12px;";

/** HTML — brukes ved «Kopier tekst», så titler blir uthevet og «Google Maps» blir en ekte lenke i Mail. */
export function buildBefaringBodyHtml(input: BefaringMailInput): string {
  const div = (inner: string) => `<div style="${MAIL_FONT_STYLE}">${inner}</div>`;
  const html = buildBefaringLines(input)
    .map((line) => {
      if (line.kind === "text") return div(line.text ? esc(line.text) : "<br>");
      if (line.kind === "field") return div(`<b>${esc(line.label)}</b>${line.text ? ` ${esc(line.text)}` : ""}`);
      const maps = line.mapsUrl ? ` (<a href="${esc(line.mapsUrl)}">Google Maps</a>)` : "";
      return div(`<b>Location ${line.index}:</b> ${esc(line.text)}${maps}`);
    })
    .join("");
  return `<div style="${MAIL_FONT_STYLE}">${html}</div>`;
}

/** mailto: med mottakere, emne og brødtekst. Mail.app åpner dette som nytt utkast. */
export function buildMailtoUrl(to: string[], subject: string, body: string): string {
  const recipients = to.map((e) => encodeURIComponent(e.trim())).join(",");
  const params = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`];
  return `mailto:${recipients}?${params.join("&")}`;
}
