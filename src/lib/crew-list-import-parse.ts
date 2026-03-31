import { randomUUID } from "node:crypto";

export type CrewImportDraftRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roles: string;
  selected: boolean;
  warnings: string[];
  /** Originaltekst brukt til debugging / manuell korrigering */
  sourceLine: string;
};

const MAX_ROWS = 400;

function normalizeSpaces(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePhone(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Del navn i for- og etternavn (siste ord = etternavn). */
export function splitNameParts(namePart: string): { first: string; last: string } {
  const t = normalizeSpaces(namePart);
  if (!t) return { first: "", last: "" };
  if (t.includes(",")) {
    const [a, b] = t.split(",").map((s) => s.trim());
    if (b) return { first: b, last: a };
  }
  const i = t.lastIndexOf(" ");
  if (i === -1) return { first: t, last: "" };
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
}

function shouldSkipLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 2) return true;
  if (/^page\s+\d+/i.test(t)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(t)) return true;
  if (/^side\s+\d+/i.test(t)) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(t)) return true;
  return false;
}

function isLikelyHeaderLine(line: string): boolean {
  const l = line.toLowerCase();
  const keywords = [
    "navn",
    "name",
    "email",
    "e-post",
    "epost",
    "phone",
    "telefon",
    "mobil",
    "rolle",
    "role",
    "avdeling",
    "department",
    "nr",
    "nr.",
  ];
  const hits = keywords.filter((k) => l.includes(k));
  return hits.length >= 2 && line.length < 140;
}

function extractEmail(s: string): { email: string; rest: string } {
  const m = s.match(/(\S+@\S+\.\S+)/);
  if (!m) return { email: "", rest: s };
  const email = m[1];
  const rest = normalizeSpaces(s.replace(m[0], " "));
  return { email, rest };
}

function extractPhone(s: string): { phone: string; rest: string } {
  const re =
    /(\+47\s?|0047\s?)?(\d{3}\s?\d{2}\s?\d{3}|\d{3}\s\d{3}\s\d{3}|\d{8})/;
  const m = s.match(re);
  if (!m) return { phone: "", rest: s };
  const phone = normalizePhone(m[0]);
  const rest = normalizeSpaces(s.replace(m[0], " "));
  return { phone, rest };
}

function detectDelimiter(lines: string[]): "tab" | "semicolon" | "line" {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return "line";
  const tabCount = nonEmpty.filter((l) => l.includes("\t")).length;
  const semiCount = nonEmpty.filter((l) => l.split(";").length >= 3).length;
  if (tabCount >= nonEmpty.length * 0.35) return "tab";
  if (semiCount >= nonEmpty.length * 0.35) return "semicolon";
  return "line";
}

/**
 * Stabsliste / call sheet: kolonne 1 = yrke/rolle, kolonne 2 = navn
 * (første ord = fornavn, resten = etternavn), deretter telefon og e-post.
 */
function splitNameFirstWordRest(nameRaw: string): {
  firstName: string;
  lastName: string;
  parenNote: string;
} {
  let name = nameRaw.trim();
  let parenNote = "";
  const paren = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    name = paren[1].trim();
    parenNote = paren[2].trim();
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "", parenNote };
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ").trim();
  return { firstName, lastName, parenNote };
}

function cleanPhoneCell(s: string): string {
  return s
    .replace(/,00\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmailFromCell(s: string): string {
  const m = s.match(/\S+@\S+\.\S+/);
  return m ? m[0] : "";
}

/** Seksjonstitler og toppfelt fra PDF (ikke personrader). */
function shouldSkipTabStabslisteRow(cols: string[]): boolean {
  if (cols.length < 2) {
    const only = (cols[0] ?? "").trim();
    if (!only) return true;
    const u = only.toUpperCase();
    const sectionOneWord = [
      "FOTO",
      "GRIP",
      "LYS",
      "LYD",
      "KOST",
      "MASK",
      "STABSLISTE",
      "PRODUKSJON",
      "LEVERANDØRER",
      "ART DEP",
      "KOST/MASK",
    ];
    if (sectionOneWord.includes(u) || u.startsWith("ART ")) return true;
    return true;
  }

  const c0 = (cols[0] ?? "").trim();
  const c1 = (cols[1] ?? "").trim();

  if (/^kunde\s*:/i.test(c0)) return true;
  if (/^byrå\s*:/i.test(c0)) return true;
  if (/^opptak\s*:/i.test(c0)) return true;
  if (/kunde.*byrå/i.test(c0) && /^produksjon$/i.test(c1)) return true;

  return false;
}

function parseTabStabslisteLine(line: string): CrewImportDraftRow | null {
  const cols = line.split("\t").map((p) => p.trim());
  while (cols.length && cols[cols.length - 1] === "") cols.pop();
  if (cols.length < 2) return null;

  if (shouldSkipTabStabslisteRow(cols)) return null;

  const role = cols[0].trim();
  const nameRaw = cols[1].trim();
  if (!nameRaw) return null;

  let phone = "";
  let email = "";
  if (cols[2]) {
    const c2 = cols[2];
    if (c2.includes("@")) {
      email = extractEmailFromCell(c2);
    } else {
      phone = cleanPhoneCell(c2);
    }
  }
  if (cols[3]) {
    const c3 = cols[3];
    if (c3.includes("@")) {
      email = extractEmailFromCell(c3) || email;
    } else if (!phone) {
      phone = cleanPhoneCell(c3);
    }
  }

  const { firstName, lastName, parenNote } = splitNameFirstWordRest(nameRaw);

  const warnings: string[] = [];
  if (!firstName) warnings.push("Mangler navn");
  else if (!lastName)
    warnings.push("Kun ett navneord — sjekk etternavn");
  if (parenNote?.trim()) {
    warnings.push(`Merknad i parentes: ${parenNote.trim()}`);
  }

  const roles = role.trim();
  return {
    id: randomUUID(),
    firstName,
    lastName,
    email,
    phone,
    roles,
    selected: Boolean(firstName && lastName),
    warnings,
    sourceLine: line.trim().slice(0, 500),
  };
}

function parseDelimitedLine(
  line: string,
  del: "tab" | "semicolon",
): CrewImportDraftRow | null {
  if (del === "tab") {
    return parseTabStabslisteLine(line);
  }

  const parts = line.split(";");
  const cols = parts.map((p) => p.trim()).filter(Boolean);
  if (cols.length === 0) return null;

  /** Semikolon: samme rekkefølge som tab hvis 2+ kolonner */
  if (cols.length >= 2) {
    const synthetic = cols.join("\t");
    const st = parseTabStabslisteLine(synthetic);
    if (st) return st;
  }

  const emails: string[] = [];
  const phones: string[] = [];
  const other: string[] = [];

  for (const c of cols) {
    const em = c.match(/\S+@\S+\.\S+/);
    if (em) {
      emails.push(em[0]);
      continue;
    }
    if (/(?:\+47|0047)?[\s\d.]{8,}/.test(c)) {
      phones.push(normalizePhone(c));
      continue;
    }
    other.push(c);
  }

  if (other.length === 0) {
    return parseLineToDraft(cols.join(" "));
  }

  let namePart = other[0];
  let roles = other.slice(1).join(", ");

  const dash = namePart.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash && dash[2].length < 80 && !dash[2].includes("@")) {
    namePart = dash[1].trim();
    roles = roles ? `${dash[2].trim()}, ${roles}` : dash[2].trim();
  }

  const paren = namePart.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    namePart = paren[1].trim();
    roles = roles ? `${paren[2].trim()}, ${roles}` : paren[2].trim();
  }

  const { first, last } = splitNameParts(namePart);
  const warnings: string[] = [];
  if (!first || !last) warnings.push("Ufullstendig navn — fyll inn manuelt");

  return {
    id: randomUUID(),
    firstName: first,
    lastName: last,
    email: (emails[0] ?? "").trim(),
    phone: (phones[0] ?? "").trim(),
    roles: roles.trim(),
    selected: Boolean(first && last),
    warnings,
    sourceLine: line.trim().slice(0, 500),
  };
}

function parseLineToDraft(line: string): CrewImportDraftRow | null {
  if (shouldSkipLine(line)) return null;
  let work = normalizeSpaces(line);
  if (work.length < 2) return null;

  let roles = "";
  const paren = work.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/);
  if (paren) {
    work = `${paren[1].trim()} ${paren[3] ?? ""}`.trim();
    roles = paren[2].trim();
  }

  const dash = work.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash && dash[2].length < 80 && !dash[2].includes("@")) {
    work = dash[1].trim();
    if (!roles) roles = dash[2].trim();
  }

  let { email, rest } = extractEmail(work);
  let { phone, rest: rest2 } = extractPhone(rest);
  let namePart = normalizeSpaces(rest2);

  const { first, last } = splitNameParts(namePart);
  const warnings: string[] = [];
  if (!first || !last) warnings.push("Ufullstendig navn — fyll inn manuelt");

  return {
    id: randomUUID(),
    firstName: first,
    lastName: last,
    email: email.trim(),
    phone: phone.trim(),
    roles: roles.trim(),
    selected: Boolean(first && last),
    warnings,
    sourceLine: line.trim().slice(0, 500),
  };
}

function splitIntoLines(text: string): string[] {
  return text
    .split(/\r\n|\n|\r/)
    .map((l) => l.replace(/\u00a0/g, " "))
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
}

/**
 * Dagsplan-PDF (Aparent): under «CREW INFO» — avdelingstype, navn, mobil.
 * pdf-parse kan gi mobil med eller uten mellomrom før tid på sett.
 */
const CREW_INFO_PHONE_TIME =
  /(\d{3}\s+\d{2}\s+\d{3}|\d{8})\s+(\d{1,2}:\d{2})/g;

function formatMobil8(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 8) return raw.trim();
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)}`;
}

function splitAvdelingNavnRest(
  avdelingOgNavn: string,
): { avdelingstype: string; firstName: string; lastName: string } | null {
  const t = normalizeSpaces(avdelingOgNavn);
  if (!t) return null;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const w0 = words[0].toLowerCase();
  if (w0 === "kunde" || w0 === "byrå" || w0 === "byra") return null;

  if (words.length === 2) {
    return {
      avdelingstype: words[0],
      firstName: words[1],
      lastName: "",
    };
  }

  if (
    words.length >= 4 &&
    /^\d+$/.test(words[words.length - 2] ?? "")
  ) {
    return {
      avdelingstype: words.slice(0, -1).join(" "),
      firstName: (words[words.length - 1] ?? "").trim(),
      lastName: "",
    };
  }

  return {
    avdelingstype: words.slice(0, words.length - 2).join(" "),
    firstName: (words[words.length - 2] ?? "").trim(),
    lastName: (words[words.length - 1] ?? "").trim(),
  };
}

function parseCrewInfoLineToRows(line: string): CrewImportDraftRow[] {
  const rows: CrewImportDraftRow[] = [];
  let pos = 0;
  const re = new RegExp(CREW_INFO_PHONE_TIME.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const beforePhone = line.slice(pos, m.index).trim();
    pos = re.lastIndex;
    const mobil = formatMobil8(m[1]);
    if (mobil.replace(/\D/g, "").length !== 8) continue;

    const parts = splitAvdelingNavnRest(beforePhone);
    if (!parts) continue;

    const warnings: string[] = [];
    if (!parts.lastName) {
      warnings.push("Kun ett navneord — sjekk etternavn");
    }

    rows.push({
      id: randomUUID(),
      firstName: parts.firstName,
      lastName: parts.lastName,
      email: "",
      phone: mobil,
      roles: parts.avdelingstype,
      selected: Boolean(
        parts.firstName &&
          (parts.lastName || parts.firstName.length > 1),
      ),
      warnings,
      sourceLine: line.trim().slice(0, 500),
    });
  }
  return rows;
}

function parseCrewInfoPdfSection(text: string): CrewImportDraftRow[] {
  const label = text.match(/CREW\s+INFO\s*:?/i);
  if (!label || label.index === undefined) return [];

  const afterCrew = text.slice(label.index);
  const endMatch = afterCrew.match(
    /\n\s*(?:AKTØR\s*\/\s*INFO|TIMEPLAN\s+I\s+D|TIMEPLAN\b|AKTØR\b)/i,
  );
  const block = endMatch
    ? afterCrew.slice(0, endMatch.index)
    : afterCrew.slice(0, 12000);

  return collectCrewInfoRowsFromLines(splitIntoLines(block));
}

/** Når seksjonsavgrensning feiler (rare PDF-er), skann alle linjer med mobil+tids-mønster. */
function parseCrewInfoFallbackScanFullText(text: string): CrewImportDraftRow[] {
  return collectCrewInfoRowsFromLines(splitIntoLines(text));
}

function collectCrewInfoRowsFromLines(lines: string[]): CrewImportDraftRow[] {
  const out: CrewImportDraftRow[] = [];
  for (const line of lines) {
    if (out.length >= MAX_ROWS) break;
    const l = line.trim();
    if (!l) continue;
    if (/^AVDELING\s+NAVN\s+MOBIL/i.test(l)) continue;
    if (/^CREW\s+INFO/i.test(l)) continue;
    if (!/\d{8}/.test(l.replace(/\s/g, ""))) continue;

    for (const row of parseCrewInfoLineToRows(l)) {
      if (out.length >= MAX_ROWS) break;
      out.push(row);
    }
  }
  return out;
}

/**
 * Tolker ren tekst (fra PDF eller limt inn) til utkast-rader.
 * Best egnet for tabeller eller linjer med navn, e-post og telefon.
 */
export function parseCrewListPlainText(text: string): CrewImportDraftRow[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  if (/CREW\s+INFO/i.test(normalized)) {
    const crewInfo = parseCrewInfoPdfSection(normalized);
    if (crewInfo.length > 0) return crewInfo;
    const fallback = parseCrewInfoFallbackScanFullText(normalized);
    if (fallback.length > 0) return fallback;
  }

  const lines = splitIntoLines(normalized);
  if (!lines.length) return [];

  const del = detectDelimiter(lines);
  const skipHeader = isLikelyHeaderLine(lines[0]);
  const start = skipHeader ? 1 : 0;
  const out: CrewImportDraftRow[] = [];

  for (let i = start; i < lines.length && out.length < MAX_ROWS; i++) {
    const line = lines[i];
    if (shouldSkipLine(line)) continue;

    const row =
      del === "line"
        ? parseLineToDraft(line)
        : parseDelimitedLine(line, del);
    if (row) out.push(row);
  }

  return out;
}
