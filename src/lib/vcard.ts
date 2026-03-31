/**
 * Minimal vCard 3.0/4.0 parsing for importer fra macOS Kontakter (.vcf / drag-drop).
 */

import type { PersonClient } from "@/lib/serialize";

export type VcardParsed = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  /** Ofte stillingstittel — brukes som forslag til roller hvis feltet er tomt */
  title?: string;
};

export type CrewFormFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  roles: string;
  defaultRate: string;
  dietaryPreference: string;
  allergies: string;
  isActive: boolean;
};

export const emptyCrewFormFields = (): CrewFormFields => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine: "",
  postalCode: "",
  city: "",
  country: "",
  roles: "",
  defaultRate: "",
  dietaryPreference: "none",
  allergies: "",
  isActive: true,
});

export function crewFieldsFromPerson(person: PersonClient): CrewFormFields {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email ?? "",
    phone: person.phone ?? "",
    addressLine: person.addressLine ?? "",
    postalCode: person.postalCode ?? "",
    city: person.city ?? "",
    country: person.country ?? "",
    roles: person.roles.join(", "),
    defaultRate: person.defaultRate != null ? String(person.defaultRate) : "",
    dietaryPreference: person.dietaryPreference,
    allergies: person.allergies ?? "",
    isActive: person.isActive,
  };
}

export function mergeVcardIntoCrewFields(
  prev: CrewFormFields,
  v: VcardParsed,
): CrewFormFields {
  const rolesFromTitle =
    v.title && !prev.roles.trim() ? v.title : prev.roles;
  return {
    ...prev,
    firstName: v.firstName ?? prev.firstName,
    lastName: v.lastName ?? prev.lastName,
    email: v.email ?? prev.email,
    phone: v.phone ?? prev.phone,
    addressLine: v.addressLine ?? prev.addressLine,
    postalCode: v.postalCode ?? prev.postalCode,
    city: v.city ?? prev.city,
    country: v.country ?? prev.country,
    roles: rolesFromTitle,
  };
}

function unfoldVcard(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function extractFirstVcard(text: string): string | null {
  const start = text.indexOf("BEGIN:VCARD");
  if (start === -1) return null;
  const end = text.indexOf("END:VCARD", start);
  if (end === -1) return null;
  return text.slice(start, end + "END:VCARD".length);
}

function unescapeVcardValue(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\;/g, ";")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\");
}

type ParsedLine = { rawName: string; left: string; value: string };

function parseContentLine(line: string): ParsedLine | null {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const left = line.slice(0, idx);
  const value = unescapeVcardValue(line.slice(idx + 1));
  const rawName = left.split(";")[0] ?? "";
  return { rawName, left, value };
}

function basePropName(rawName: string): string {
  const base = rawName.includes(".") ? rawName.split(".").pop()! : rawName;
  return base.toUpperCase();
}

function splitFullName(fn: string): { first: string; last: string } {
  const t = fn.trim();
  const i = t.lastIndexOf(" ");
  if (i === -1) return { first: t, last: "" };
  return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
}

function parseN(value: string): { first: string; last: string } {
  const parts = value.split(";");
  const family = (parts[0] ?? "").trim();
  const given = (parts[1] ?? "").trim();
  return { first: given, last: family };
}

function pickEmail(lines: ParsedLine[]): string | undefined {
  const emails = lines.filter((p) => basePropName(p.rawName) === "EMAIL");
  const pref = emails.find((p) => /TYPE=PREF/i.test(p.left));
  const chosen = pref ?? emails[0];
  const v = chosen?.value.trim();
  return v || undefined;
}

function pickTel(lines: ParsedLine[]): string | undefined {
  const tels = lines.filter((p) => basePropName(p.rawName) === "TEL");
  const cell = tels.find(
    (t) =>
      /TYPE=CELL|TYPE=MOBILE|TYPE=IPHONE|TYPE=IPHONE\s*SMS/i.test(t.left),
  );
  const voice = tels.find((t) => /TYPE=VOICE|TYPE=HOME|TYPE=WORK/i.test(t.left));
  const chosen = cell ?? voice ?? tels[0];
  const v = chosen?.value.trim();
  return v || undefined;
}

/** vCard ADR: PO;ext;street;locality;region;postal;country */
function pickAdrFromVcard(lines: ParsedLine[]): {
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;
} {
  const adrs = lines.filter((p) => basePropName(p.rawName) === "ADR");
  const home = adrs.find((a) => /TYPE=HOME/i.test(a.left)) ?? adrs[0];
  if (!home) return {};
  const parts = home.value.split(";");
  const ext = (parts[1] ?? "").trim();
  const street = (parts[2] ?? "").trim();
  const line = [ext, street].filter(Boolean).join(" ").trim();
  const locality = (parts[3] ?? "").trim();
  const postal = (parts[5] ?? "").trim();
  const country = (parts[6] ?? "").trim();
  return {
    addressLine: line || undefined,
    postalCode: postal || undefined,
    city: locality || undefined,
    country: country || undefined,
  };
}

function pickTitle(lines: ParsedLine[]): string | undefined {
  const t = lines.find((p) => basePropName(p.rawName) === "TITLE");
  const v = t?.value.trim();
  return v || undefined;
}

/**
 * Leser første vCard i strengen og returnerer felter mappet til crew-skjema.
 */
export function parseVcardText(raw: string): VcardParsed | null {
  const unfolded = unfoldVcard(raw.trim());
  const block = extractFirstVcard(unfolded);
  if (!block) return null;

  const lines = block.split(/\r?\n/).filter(Boolean);
  const props: ParsedLine[] = [];
  for (const line of lines) {
    if (
      line.startsWith("BEGIN:") ||
      line.startsWith("END:") ||
      line.startsWith("VERSION:")
    ) {
      continue;
    }
    const p = parseContentLine(line);
    if (p) props.push(p);
  }

  let firstName = "";
  let lastName = "";

  const nProp = props.find((p) => basePropName(p.rawName) === "N");
  if (nProp?.value) {
    const n = parseN(nProp.value);
    firstName = n.first;
    lastName = n.last;
  } else {
    const fnProp = props.find((p) => basePropName(p.rawName) === "FN");
    if (fnProp?.value) {
      const sp = splitFullName(fnProp.value);
      firstName = sp.first;
      lastName = sp.last;
    }
  }

  const out: VcardParsed = {};
  if (firstName) out.firstName = firstName;
  if (lastName) out.lastName = lastName;
  const email = pickEmail(props);
  if (email) out.email = email;
  const phone = pickTel(props);
  if (phone) out.phone = phone;
  const adr = pickAdrFromVcard(props);
  if (adr.addressLine) out.addressLine = adr.addressLine;
  if (adr.postalCode) out.postalCode = adr.postalCode;
  if (adr.city) out.city = adr.city;
  if (adr.country) out.country = adr.country;
  const title = pickTitle(props);
  if (title) out.title = title;

  if (
    !out.firstName &&
    !out.lastName &&
    !out.email &&
    !out.phone &&
    !out.addressLine &&
    !out.postalCode &&
    !out.city &&
    !out.country &&
    !out.title
  ) {
    return null;
  }

  return out;
}
