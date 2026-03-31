import { z } from "zod";
import { formatNorwegianMobileFromRaw } from "@/lib/norwegian-mobile";

/** Delt mellom klient og server (etter zod-parse på server). */
export type PayrollRowLike = {
  isSectionHeader: boolean;
  sectionTitle?: string | null;
  personId?: string | null;
  fullName: string;
  projectLabel?: string;
  addressLine?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  honorar?: number | null;
  nationalId?: string | null;
  bankAccount?: string | null;
  mobile?: string | null;
  email?: string | null;
  sensitiveFieldsMaskInUi?: boolean;
  segment?: "crew" | "cast";
};

export function validatePayrollRowsForSave(
  rows: PayrollRowLike[],
): { ok: true } | { ok: false; error: string } {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowLabel = `Rad ${i + 1}`;
    if (r.isSectionHeader) {
      if (!(r.sectionTitle ?? "").trim()) {
        return { ok: false, error: `${rowLabel}: Seksjonstittel mangler.` };
      }
      continue;
    }
    if (r.fullName.trim().length < 2) {
      return { ok: false, error: `${rowLabel}: Navn mangler (minst to tegn).` };
    }
    if (!(r.projectLabel ?? "").trim()) {
      return { ok: false, error: `${rowLabel}: Prosjekt mangler.` };
    }
    if (!(r.addressLine ?? "").trim()) {
      return { ok: false, error: `${rowLabel}: Adresse (gate) mangler.` };
    }
    if (!(r.postalCode ?? "").trim()) {
      return { ok: false, error: `${rowLabel}: Postnummer mangler.` };
    }
    if (!(r.city ?? "").trim()) {
      return { ok: false, error: `${rowLabel}: Poststed mangler.` };
    }
    if (r.honorar == null || Number.isNaN(r.honorar)) {
      return { ok: false, error: `${rowLabel}: Honorar mangler.` };
    }
    const mask = r.sensitiveFieldsMaskInUi === true;
    const pid = r.personId?.trim();
    const needsIdBank = !(mask && pid);
    if (needsIdBank) {
      if (!(r.nationalId ?? "").trim()) {
        return { ok: false, error: `${rowLabel}: Personnr. mangler.` };
      }
      if (!(r.bankAccount ?? "").trim()) {
        return { ok: false, error: `${rowLabel}: Kontonr. mangler.` };
      }
    }
    const mob = formatNorwegianMobileFromRaw(r.mobile);
    if (!mob) {
      return {
        ok: false,
        error: `${rowLabel}: Mobil må være nøyaktig 8 siffer (f.eks. 412 34 567).`,
      };
    }
    const emailTrim = (r.email ?? "").trim();
    if (!emailTrim) {
      return { ok: false, error: `${rowLabel}: E-post mangler.` };
    }
    if (!z.string().email().safeParse(emailTrim).success) {
      return { ok: false, error: `${rowLabel}: Ugyldig e-postadresse.` };
    }
  }
  return { ok: true };
}
