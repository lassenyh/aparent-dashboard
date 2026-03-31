import { PDFParse } from "pdf-parse";

/** Tekst fra PDF (f.eks. statistkontrakt). Skannede bilder uten tekstlag gir tom streng. */
export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
