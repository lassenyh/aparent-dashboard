"use server";

import { parsePayrollContractPlainText } from "@/lib/payroll-contract-pdf-parse";
import { extractTextFromPdfBuffer } from "@/lib/pdf-text";

const MAX_PDF_BYTES = 6 * 1024 * 1024;

export type PayrollContractPdfResult =
  | {
      ok: true;
      data: ReturnType<typeof parsePayrollContractPlainText>;
      textPreview: string;
    }
  | { ok: false; error: string };

/** Leser statistkontrakt / lignende PDF og tolker personfelter til lønningsliste. */
export async function parsePayrollContractPdf(
  formData: FormData,
): Promise<PayrollContractPdfResult> {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Velg en PDF-fil." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      error: `PDF er for stor (maks ${MAX_PDF_BYTES / 1024 / 1024} MB).`,
    };
  }

  let text: string;
  try {
    const buf = await file.arrayBuffer();
    text = await extractTextFromPdfBuffer(buf);
  } catch {
    return {
      ok: false,
      error: "Kunne ikke lese PDF. Prøv en annen fil eller kopier tekst manuelt.",
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error:
        "Fant ingen tekst i PDF-en (kanskje skannet bilde uten OCR?). Bruk en tekstbasert PDF eller fyll inn manuelt.",
    };
  }

  const data = parsePayrollContractPlainText(trimmed);
  if (data.matchedFields.length === 0) {
    return {
      ok: false,
      error:
        "Fant ingen kjente felt (navn, adresse, kontonummer, …). Sjekk at PDF-en inneholder tekst, eller fyll raden inn manuelt.",
    };
  }

  return {
    ok: true,
    data,
    textPreview: trimmed.slice(0, 1500),
  };
}
