/**
 * Tolker klartekst fra PDF (f.eks. Aparent-statistavtale i Oneflow).
 *
 * Primærmal: «STATISTAVTALE» med seksjon «3. PERSONLIG INFORMASJON» der etikett
 * står på én linje og verdi på neste (Fullt navn, Fødselsnummer, Adresse …,
 * Mobilnummer, Email, Kontonummer). Honorar i avsnitt «2. HONORAR».
 *
 * Andre PDF-er faller tilbake til generelle heuristikk.
 */

export type PayrollContractExtract = {
  fullName: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  nationalId: string | null;
  bankAccount: string | null;
  mobile: string | null;
  email: string | null;
  honorar: number | null;
  /** Satt når avtalen sier at beløpet inkl. feriepenger (f.eks. 10,2 %). */
  includesHolidayPay: boolean | null;
  /** true når kontrakten ser ut til å være avhuket for faktura (ikke lønn). */
  invoiceOnly: boolean | null;
  /** Felt vi med rimelig sikkerhet fant (for tilbakemelding i UI). */
  matchedFields: string[];
};

const empty = (): Omit<PayrollContractExtract, "matchedFields"> => ({
  fullName: null,
  addressLine: null,
  postalCode: null,
  city: null,
  country: null,
  nationalId: null,
  bankAccount: null,
  mobile: null,
  email: null,
  honorar: null,
  includesHolidayPay: null,
  invoiceOnly: null,
});

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function cleanLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Navnfelt: stor forbokstav per ord (inkl. bindestrek/apostrof). */
function toNameTitleCase(raw: string): string {
  const s = cleanLine(raw).toLocaleLowerCase("nb-NO");
  return s.replace(
    /(^|[\s'-])([a-zæøå])/giu,
    (_m, sep: string, chr: string) => `${sep}${chr.toLocaleUpperCase("nb-NO")}`,
  );
}

/** Adresse/poststed: stor forbokstav per ord, behold tall/tegn. */
function toAddressTitleCase(raw: string): string {
  const s = cleanLine(raw).toLocaleLowerCase("nb-NO");
  const titled = s.replace(
    /(^|[\s'-])([a-zæøå])/giu,
    (_m, sep: string, chr: string) => `${sep}${chr.toLocaleUpperCase("nb-NO")}`,
  );
  // Behold bokstav etter husnummer i stor form (f.eks. 3C).
  return titled.replace(/(\d+)([a-zæøå])\b/giu, (_m, d: string, l: string) =>
    `${d}${l.toLocaleUpperCase("nb-NO")}`,
  );
}

const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

/** F.eks. «Industrigata 36, 0357 Oslo» (Aparent / Oneflow-statistavtale). */
function parseCombinedAddressLine(
  line: string,
): { addressLine: string; postalCode: string; city: string } | null {
  const t = line.trim();
  // Vanlig format: "Gate 1, 0123 Oslo"
  const withComma = t.match(/^(.+?),\s*(\d{4})\s+(.+)$/);
  if (withComma) {
    return {
      addressLine: toAddressTitleCase(withComma[1].trim()),
      postalCode: withComma[2],
      city: toAddressTitleCase(withComma[3].trim()),
    };
  }
  // Fallback uten komma: "Gate 1 0123 Oslo"
  const noComma = t.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
  if (noComma) {
    const addressLine = noComma[1].trim();
    const postalCode = noComma[2];
    const city = noComma[3].trim();
    if (addressLine.length >= 3 && city.length >= 2) {
      return {
        addressLine: toAddressTitleCase(addressLine),
        postalCode,
        city: toAddressTitleCase(city),
      };
    }
  }
  return null;
}

function normalizeLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split(/\n/)
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter((l) => l.length > 0);
}

function isLikelyAddressLabelFragment(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return true;
  return (
    t === "adresse" ||
    t.includes("inkludert postnummer og sted") ||
    t.includes("personlig informasjon") ||
    t.includes("personlig informasjon.")
  );
}

function isLikelyNonAddressValue(line: string): boolean {
  const t = line.trim().toLowerCase();
  return (
    t.includes("totaltbeløpet inkluderer") ||
    t.includes("beregning av feriepenger") ||
    t.includes("for oppdraget utbetales") ||
    t.includes("samlet brutto vederlag")
  );
}

function pickAddressCandidate(lines: string[], labelIndex: number): string | null {
  for (let j = labelIndex + 1; j < Math.min(lines.length, labelIndex + 7); j++) {
    const cand = lines[j]?.trim() ?? "";
    if (!cand) continue;
    if (isLikelyAddressLabelFragment(cand)) continue;
    if (isLikelyNonAddressValue(cand)) continue;
    return cand;
  }
  return null;
}

function detectInvoiceSelection(text: string): boolean | null {
  const lines = normalizeLines(text);
  const checkedTokenRe = /(?:\[[xX]\]|\([xX]\)|☒|☑|✅|✔|✗|✘|■|\bX\b)/i;
  const uncheckedTokenRe = /(?:\[\s\]|\(\s\)|☐|□)/;
  const invoiceWordRe = /\bfaktura\b/i;
  const salaryWordRe = /\b(?:lønn|lonn)\b/i;
  const invoiceStandaloneRe = /^faktura$/i;
  const salaryStandaloneRe = /^(lønn|lonn)$/i;

  // Oneflow-mønster: egen avhukingslinje (""/checksymbol), deretter verdi-linje.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!checkedTokenRe.test(line) || uncheckedTokenRe.test(line)) continue;
    const near = [lines[i - 1], lines[i + 1], lines[i + 2], lines[i - 2]]
      .filter((x): x is string => Boolean(x))
      .map((x) => x.trim());
    if (near.some((x) => invoiceStandaloneRe.test(x))) return true;
    if (near.some((x) => salaryStandaloneRe.test(x))) return false;
  }

  const scoreWordAt = (wordIndex: number, wordRe: RegExp): number => {
    let score = 0;
    const from = Math.max(0, wordIndex - 2);
    const to = Math.min(lines.length - 1, wordIndex + 2);
    for (let i = from; i <= to; i++) {
      const line = lines[i];
      if (!wordRe.test(lines[wordIndex])) continue;
      if (checkedTokenRe.test(line) && !uncheckedTokenRe.test(line)) score += 2;
      if (
        i !== wordIndex &&
        checkedTokenRe.test(line) &&
        /^[\s[\]()xX☒☑✅✔✗✘■☐□]+$/.test(line)
      ) {
        score += 1;
      }
    }
    if (checkedTokenRe.test(lines[wordIndex]) && !uncheckedTokenRe.test(lines[wordIndex])) {
      score += 2;
    }
    return score;
  };

  let invoiceScore = 0;
  let salaryScore = 0;
  for (let i = 0; i < lines.length; i++) {
    if (invoiceWordRe.test(lines[i])) {
      invoiceScore += scoreWordAt(i, invoiceWordRe);
      if (/faktura\s*:\s*(ja|yes)/i.test(lines[i])) invoiceScore += 2;
    }
    if (salaryWordRe.test(lines[i])) {
      salaryScore += scoreWordAt(i, salaryWordRe);
      if (/(lønn|lonn)\s*:\s*(ja|yes)/i.test(lines[i])) salaryScore += 2;
    }
  }

  if (invoiceScore >= salaryScore + 2 && invoiceScore > 0) return true;
  if (salaryScore >= invoiceScore + 2 && salaryScore > 0) return false;

  // Fallback: tydelig tekstlig valg i samme setning.
  if (/(utbetal(?:ing|es)|betalingsform).{0,30}faktura/i.test(text)) {
    if (!/(utbetal(?:ing|es)|betalingsform).{0,30}(lønn|lonn)/i.test(text)) {
      return true;
    }
  }
  return null;
}

function parseAmountLoose(raw: string): number | null {
  const m = raw.match(/(\d[\d\s.,]*)/);
  if (!m) return null;
  const s = m[1].replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "");
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Aparent / Oneflow «STATISTAVTALE» — etikett på én linje, verdi på neste.
 */
function parseAparentOneflowStatistAvtale(
  text: string,
  o: Omit<PayrollContractExtract, "matchedFields">,
  matched: Set<string>,
): void {
  const lines = normalizeLines(text);

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const lower = line.toLowerCase();

    if (/^fullt\s+navn$/i.test(line)) {
      o.fullName = toNameTitleCase(next.replace(/[,;]+$/, "").trim());
      matched.add("fullName");
      continue;
    }

    if (/fødselsnummer/i.test(line) && /11\s*siffer/i.test(line)) {
      const d = onlyDigits(next);
      if (d.length === 11) {
        o.nationalId = d;
        matched.add("nationalId");
      }
      continue;
    }

    if (
      /adresse,?\s+inkludert\s+postnummer\s+og\s+sted/i.test(line) ||
      /^adresse$/i.test(line)
    ) {
      const candidate = pickAddressCandidate(lines, i) ?? next;
      const parsed = parseCombinedAddressLine(candidate);
      if (parsed) {
        o.addressLine = parsed.addressLine;
        o.postalCode = parsed.postalCode;
        o.city = parsed.city;
        matched.add("addressLine");
        matched.add("postalCode");
        matched.add("city");
      } else if (
        candidate &&
        !isLikelyAddressLabelFragment(candidate) &&
        !isLikelyNonAddressValue(candidate)
      ) {
        o.addressLine = toAddressTitleCase(candidate);
        matched.add("addressLine");
      }
      continue;
    }

    if (/^mobilnummer$/i.test(line) || /^mobil$/i.test(line)) {
      const d = onlyDigits(next);
      if (d.length === 8) {
        o.mobile = d;
        matched.add("mobile");
      } else if (d.length >= 8) {
        const m = d.match(/(\d{8})/);
        if (m) {
          o.mobile = m[1];
          matched.add("mobile");
        }
      }
      continue;
    }

    if (/^e-?mail$/i.test(line) || /^epost$/i.test(line)) {
      const em = next.match(EMAIL_RE);
      if (em) {
        o.email = em[0];
        matched.add("email");
      }
      continue;
    }

    if (/kontonummer/i.test(line) && /11\s*siffer/i.test(line)) {
      const d = onlyDigits(next);
      if (d.length === 11) {
        o.bankAccount = d;
        matched.add("bankAccount");
      }
      continue;
    }
  }

  // Honorar: «For oppdraget utbetales et samlet brutto vederlag på» → neste linje tall
  const honorarBlock =
    /For\s+oppdraget\s+utbetales\s+et\s+samlet\s+brutto\s+vederlag\s+på\s*\n\s*([^\n]+)/i.exec(
      text.replace(/\r\n/g, "\n"),
    );
  if (honorarBlock) {
    const n = parseAmountLoose(honorarBlock[1]);
    if (Number.isFinite(n) && n > 0) {
      o.honorar = n;
      matched.add("honorar");
    }
  } else {
    for (let i = 0; i < lines.length - 1; i++) {
      if (/samlet\s+brutto\s+vederlag\s+på\s*$/i.test(lines[i])) {
        const n = parseAmountLoose(lines[i + 1]);
        if (Number.isFinite(n) && n > 0) {
          o.honorar = n;
          matched.add("honorar");
        }
        break;
      }
    }
  }

  // Feriepenger er inkludert i brutto (typisk formulering i avtalen)
  if (
    /inkluderer\s+beregning\s+av\s+feriepenger/i.test(text) ||
    /totaltbeløpet\s+inkluderer.*feriepenger/i.test(text)
  ) {
    o.includesHolidayPay = true;
    matched.add("includesHolidayPay");
  }

  if (/STATISTAVTALE|statistavtale/i.test(text) && !o.country) {
    o.country = "Norge";
    matched.add("country");
  }

  const invoiceOnly = detectInvoiceSelection(text);
  if (invoiceOnly != null) {
    o.invoiceOnly = invoiceOnly;
    matched.add("invoiceOnly");
  }
}

/** Første treff av flere regex (multiline). */
function firstGroup(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return cleanLine(m[1]);
  }
  return null;
}

/** Norsk postnummer + sted på én linje. */
const POSTAL_LINE_RE =
  /(?:^|\n)\s*(?:Postnummer|Postnr\.?|Post\s*nr)\s*[:.]?\s*(\d{4})\s+([A-Za-zÆØÅæøå][^\n]*?)(?=\n|$)/i;

/** «0482 Oslo» uten eksplisitt label. */
const POSTAL_INLINE_RE =
  /\b(\d{4})\s+([A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\- ]{1,40})\b/;

/** Ikke-overlappende 11-sifrede blokker. */
function scanElevenDigitBlocks(digits: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i <= digits.length - 11) {
    const sub = digits.slice(i, i + 11);
    if (/^\d{11}$/.test(sub)) {
      out.push(sub);
      i += 11;
    } else {
      i += 1;
    }
  }
  return out;
}

function classifyElevenDigitNumbers(
  text: string,
): { nationalId: string | null; bankAccount: string | null } {
  let nationalId: string | null = null;
  let bankAccount: string | null = null;

  for (const line of text.split(/\n/)) {
    const lower = line.toLowerCase();
    const d = onlyDigits(line);
    if (d.length < 11) continue;

    const blocks = scanElevenDigitBlocks(d);
    if (!blocks.length) continue;

    const isPerson =
      /person|fødsels|fodsels|fnr|f\.nr|identitet/i.test(lower);
    const isBank =
      /konto|bank|kontonr|iban|utbetaling|norsk\s*kontonummer/i.test(lower);

    for (const chunk of blocks) {
      if (isBank && !isPerson) {
        bankAccount = chunk;
      } else if (isPerson && !isBank) {
        nationalId = chunk;
      } else if (isBank && isPerson) {
        nationalId = chunk;
      }
    }
  }

  const globalDigits = onlyDigits(text);
  const globalBlocks = scanElevenDigitBlocks(globalDigits);

  if (!nationalId && !bankAccount && globalBlocks.length === 1) {
    nationalId = globalBlocks[0];
  } else if (!nationalId && !bankAccount && globalBlocks.length >= 2) {
    nationalId = globalBlocks[0];
    bankAccount = globalBlocks[1];
  } else if (nationalId && !bankAccount && globalBlocks.length >= 2) {
    bankAccount = globalBlocks.find((b) => b !== nationalId) ?? null;
  } else if (!nationalId && bankAccount && globalBlocks.length >= 2) {
    nationalId = globalBlocks.find((b) => b !== bankAccount) ?? null;
  }

  return { nationalId, bankAccount };
}

function extractMobile(text: string): string | null {
  const lines = text.split(/\n/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      !/mobil|telefon|tlf|phone|nett|sms/i.test(lower) &&
      lines.length > 3
    ) {
      continue;
    }
    const d = onlyDigits(line);
    if (d.length === 8) return d;
    if (d.length === 10 && d.startsWith("47")) return d.slice(2);
    if (d.length === 11 && d.startsWith("0047")) return d.slice(4);
  }
  const all = onlyDigits(text);
  for (let i = 0; i <= all.length - 8; i++) {
    const eight = all.slice(i, i + 8);
    if (eight.startsWith("0")) continue;
    if (/^[1-9]\d{7}$/.test(eight)) return eight;
  }
  return null;
}

function parseHonorarLegacy(text: string): number | null {
  const m = firstGroup(text, [
    /(?:Honorar|Vederlag|Oppdragssum|Beløp|Belop)\s*[:.]?\s*([\d\s.,]+)\s*(?:kr|NOK)?/i,
    /([\d\s.,]+)\s*kr\s*(?:per|\/)\s*(?:dag|døgn|oppdrag)/i,
  ]);
  if (!m) return null;
  const n = Number(m.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Utfyller felt som fortsatt er tomme etter Oneflow-parser. */
function applyLegacyFallback(
  text: string,
  o: Omit<PayrollContractExtract, "matchedFields">,
  matched: Set<string>,
): void {
  if (!o.fullName) {
    const fullName = firstGroup(text, [
      /(?:^|\n)\s*(?:Navn|Fullt\s+navn|Statist(?:ens)?\s+navn|Utøver|Medvirkende)\s*[:.]?\s*([^\n]+?)(?=\n|$)/i,
    ]);
    if (fullName) {
      o.fullName = toNameTitleCase(fullName.replace(/[,;]+$/, "").trim());
      matched.add("fullName");
    }
  }

  if (!o.addressLine) {
    const addr = firstGroup(text, [
      /(?:^|\n)\s*(?:Gateadresse|Adresse|Besøksadresse|Bostedsadresse)\s*[:.]?\s*([^\n]+?)(?=\n|$)/i,
    ]);
    if (addr) {
      if (
        isLikelyAddressLabelFragment(addr) ||
        isLikelyNonAddressValue(addr)
      ) {
        // ignorer åpenbart feil linje; la andre heuristikker prøve videre
      } else {
      const combined = parseCombinedAddressLine(addr);
      if (combined) {
        o.addressLine = combined.addressLine;
        o.postalCode = combined.postalCode;
        o.city = combined.city;
        matched.add("addressLine");
        matched.add("postalCode");
        matched.add("city");
      } else {
        o.addressLine = toAddressTitleCase(addr);
        matched.add("addressLine");
      }
      }
    }
  }

  let pc = o.postalCode;
  let cityFromPostal: string | null = null;
  if (!pc) {
    const postalLine = text.match(POSTAL_LINE_RE);
    if (postalLine) {
      pc = postalLine[1];
      cityFromPostal = cleanLine(postalLine[2]);
    }
  }
  if (!pc) {
    const inline = text.match(POSTAL_INLINE_RE);
    if (inline) {
      const inlineCity = cleanLine(inline[2]);
      if (!isLikelyNonAddressValue(inlineCity)) {
        pc = inline[1];
        cityFromPostal = toAddressTitleCase(inlineCity);
      }
    }
  }
  if (pc && !o.postalCode) {
    o.postalCode = pc;
    matched.add("postalCode");
  }
  if (!o.city && cityFromPostal) {
    o.city = toAddressTitleCase(cityFromPostal);
    matched.add("city");
  }

  if (!o.city) {
    const cityOnly = firstGroup(text, [
      /(?:^|\n)\s*Poststed\s*[:.]?\s*([^\n]+?)(?=\n|$)/i,
    ]);
    if (cityOnly) {
      o.city = toAddressTitleCase(cityOnly);
      matched.add("city");
    }
  }

  if (!o.country) {
    const land = firstGroup(text, [
      /(?:^|\n)\s*Land\s*[:.]?\s*([^\n]+?)(?=\n|$)/i,
    ]);
    if (land) {
      o.country = land;
      matched.add("country");
    }
  }

  if (!o.nationalId || !o.bankAccount) {
    const { nationalId, bankAccount } = classifyElevenDigitNumbers(text);
    if (!o.nationalId && nationalId) {
      o.nationalId = nationalId;
      matched.add("nationalId");
    }
    if (!o.bankAccount && bankAccount) {
      o.bankAccount = bankAccount;
      matched.add("bankAccount");
    }
  }

  if (!o.email) {
    const em = text.match(EMAIL_RE);
    if (em) {
      o.email = em[0];
      matched.add("email");
    }
  }

  if (!o.mobile) {
    const mob = extractMobile(text);
    if (mob) {
      o.mobile = mob;
      matched.add("mobile");
    }
  }

  if (o.honorar == null) {
    const hon = parseHonorarLegacy(text);
    if (hon != null) {
      o.honorar = hon;
      matched.add("honorar");
    }
  }
}

export function parsePayrollContractPlainText(
  raw: string,
): PayrollContractExtract {
  const text = raw.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  const matched = new Set<string>();
  const o = empty();

  parseAparentOneflowStatistAvtale(text, o, matched);

  applyLegacyFallback(text, o, matched);

  return {
    ...o,
    matchedFields: [...matched],
  };
}
