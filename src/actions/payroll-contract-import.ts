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
  try {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`APARENT_PAYROLL_PDF_READ_FAILED ${msg}`);
      return {
        ok: false,
        error:
          "Kunne ikke lese PDF. Prøv en annen fil eller kopier tekst manuelt.",
      };
    }

    const trimmed = text.trim();
    if (!trimmed) {
      console.warn("APARENT_PAYROLL_PDF_EMPTY_TEXT");
      return {
        ok: false,
        error:
          "Fant ingen tekst i PDF-en (kanskje skannet bilde uten OCR?). Bruk en tekstbasert PDF eller fyll inn manuelt.",
      };
    }

    let data: ReturnType<typeof parsePayrollContractPlainText>;
    try {
      data = parsePayrollContractPlainText(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`APARENT_PAYROLL_PDF_PARSE_FAILED ${msg}`);
      return {
        ok: false,
        error:
          "Kunne ikke tolke PDF-teksten. Fyll raden inn manuelt, eller prøv en annen PDF.",
      };
    }

    if (data.matchedFields.length === 0) {
      console.warn("APARENT_PAYROLL_PDF_NO_MATCHED_FIELDS");
      return {
        ok: false,
        error:
          "Fant ingen kjente felt (navn, adresse, kontonummer, …). Sjekk at PDF-en inneholder tekst, eller fyll raden inn manuelt.",
      };
    }

    console.log(
      `APARENT_PAYROLL_PDF_IMPORT_OK fields=${data.matchedFields.length}`,
    );
    return {
      ok: true,
      data,
      textPreview: trimmed.slice(0, 1500),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`APARENT_PAYROLL_PDF_IMPORT_UNHANDLED ${msg}`);
    return {
      ok: false,
      error:
        "Noe gikk galt ved lesing av PDF. Prøv igjen, eller fyll inn manuelt.",
    };
  }
}
