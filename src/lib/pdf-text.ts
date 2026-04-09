/**
 * Må matche `pdfjs-dist`-versjonen som følger med `pdf-parse`
 * (sjekk: node_modules/pdfjs-dist/package.json → version).
 */
const PDFJS_ASSET_VERSION = "5.4.296";

const PDFJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_ASSET_VERSION}`;

/** Samme worker som `pdf-parse` / legacy `pdf.mjs` — må settes ellers leter pdf.js etter `pdf.worker.mjs` i `.next/chunks` (finnes ikke på Vercel). */
const PDFJS_WORKER_URL = `${PDFJS_CDN_BASE}/legacy/build/pdf.worker.mjs`;

/** Tekst fra PDF (f.eks. statistkontrakt). Skannede bilder uten tekstlag gir tom streng. */
export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
): Promise<string> {
  /** Må kjøre før `pdf-parse` — ellers: ReferenceError: DOMMatrix is not defined (Node/Vercel). */
  await import("./pdf-dom-polyfills");
  const { PDFParse } = await import("pdf-parse");

  /** Før noen `getDocument` — ellers «fake worker» prøver feil sti under `.next/server/chunks/ssr/`. */
  PDFParse.setWorker(PDFJS_WORKER_URL);

  /** Unngå at worker «overtar» buffer (transfer) feil på serverless; bruk kopi. */
  const data = new Uint8Array(buffer.slice(0));

  /**
   * CMap / standardfonter / WASM fra CDN når lokale filer mangler i Lambda.
   * `useWorkerFetch: true` lar worker hente disse over HTTPS.
   */
  const parser = new PDFParse({
    data,
    verbosity: 0,
    useWorkerFetch: true,
    useSystemFonts: true,
    cMapUrl: `${PDFJS_CDN_BASE}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_CDN_BASE}/standard_fonts/`,
    wasmUrl: `${PDFJS_CDN_BASE}/wasm/`,
  });

  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
