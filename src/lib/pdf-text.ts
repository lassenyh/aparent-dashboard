/** Tekst fra PDF (f.eks. statistkontrakt). Skannede bilder uten tekstlag gir tom streng. */
export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
): Promise<string> {
  /** Må kjøre før `pdf-parse` — ellers: ReferenceError: DOMMatrix is not defined (Node/Vercel). */
  await import("./pdf-dom-polyfills");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
