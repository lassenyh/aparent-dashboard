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
});

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function cleanLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const EMAIL_RE =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

/** F.eks. «Industrigata 36, 0357 Oslo» (Aparent / Oneflow-statistavtale). */
function parseCombinedAddressLine(
  line: string,
): { addressLine: string; postalCode: string; city: string } | null {
  const t = line.trim();
  const m = t.match(/^(.+?),\s*(\d{4})\s+(.+)$/);
  if (!m) return null;
  return {
    addressLine: m[1].trim(),
    postalCode: m[2],
    city: m[3].trim(),
  };
}

function normalizeLines(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .split(/\n/)
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter((l) => l.length > 0);
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
      o.fullName = next.replace(/[,;]+$/, "").trim();
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

    if (/adresse,?\s+inkludert\s+postnummer\s+og\s+sted/i.test(line)) {
      const parsed = parseCombinedAddressLine(next);
      if (parsed) {
        o.addressLine = parsed.addressLine;
        o.postalCode = parsed.postalCode;
        o.city = parsed.city;
        matched.add("addressLine");
        matched.add("postalCode");
        matched.add("city");
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
    /For\s+oppdraget\s+utbetales\s+et\s+samlet\s+brutto\s+vederlag\s+på\s*\n\s*([\d\s.,]+)/i.exec(
      text.replace(/\r\n/g, "\n"),
    );
  if (honorarBlock) {
    const n = Number(
      honorarBlock[1].replace(/\s/g, "").replace(",", ".").replace(/\s/g, ""),
    );
    if (Number.isFinite(n) && n > 0) {
      o.honorar = n;
      matched.add("honorar");
    }
  } else {
    for (let i = 0; i < lines.length - 1; i++) {
      if (/samlet\s+brutto\s+vederlag\s+på\s*$/i.test(lines[i])) {
        const rawNum = lines[i + 1].replace(/\s/g, "");
        const n = Number(rawNum.replace(",", "."));
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
      o.fullName = fullName.replace(/[,;]+$/, "").trim();
      matched.add("fullName");
    }
  }

  if (!o.addressLine) {
    const addr = firstGroup(text, [
      /(?:^|\n)\s*(?:Gateadresse|Adresse|Besøksadresse|Bostedsadresse)\s*[:.]?\s*([^\n]+?)(?=\n|$)/i,
    ]);
    if (addr) {
      const combined = parseCombinedAddressLine(addr);
      if (combined) {
        o.addressLine = combined.addressLine;
        o.postalCode = combined.postalCode;
        o.city = combined.city;
        matched.add("addressLine");
        matched.add("postalCode");
        matched.add("city");
      } else {
        o.addressLine = addr;
        matched.add("addressLine");
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
      pc = inline[1];
      cityFromPostal = cleanLine(inline[2]);
    }
  }
  if (pc && !o.postalCode) {
    o.postalCode = pc;
    matched.add("postalCode");
  }
  if (!o.city && cityFromPostal) {
    o.city = cityFromPostal;
    matched.add("city");
  }

  if (!o.city) {
    const cityOnly = firstGroup(text, [
      /(?:^|\n)\s*Poststed\s*[:.]?\s*([^\n]+?)(?=\n|$)/i,
    ]);
    if (cityOnly) {
      o.city = cityOnly;
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
