import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Må matche `pdfjs-dist` som følger med `pdf-parse` (se node_modules/pdfjs-dist/package.json). */
const PDFJS_CDN_BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296";

/**
 * Node/Vercel: worker må være `file:` eller `data:` — ikke `https:` (ESM-loader feiler).
 * Peker på faktisk `pdf.worker.mjs` under `node_modules` (inkluderes via outputFileTracingIncludes).
 */
function getPdfWorkerSrc(): string {
  const require = createRequire(import.meta.url);
  const pdfMainPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = path.join(path.dirname(pdfMainPath), "pdf.worker.mjs");
  return pathToFileURL(workerPath).href;
}

/** Tekst fra PDF (f.eks. statistkontrakt). Skannede bilder uten tekstlag gir tom streng. */
export async function extractTextFromPdfBuffer(
  buffer: ArrayBuffer,
): Promise<string> {
  /** Må kjøre før `pdf-parse` — ellers: ReferenceError: DOMMatrix is not defined (Node/Vercel). */
  await import("./pdf-dom-polyfills");
  const { PDFParse } = await import("pdf-parse");

  /** Før `getDocument` — ellers feiler «fake worker» med feil sti eller ugyldig worker-URL. */
  PDFParse.setWorker(getPdfWorkerSrc());

  /** Unngå at worker «overtar» buffer (transfer) feil på serverless; bruk kopi. */
  const data = new Uint8Array(buffer.slice(0));

  /**
   * CMap / standardfonter / WASM fra CDN når lokale filer mangler i Lambda.
   * `useWorkerFetch: true` lar worker hente disse over HTTPS (gyldig for fetch, ikke for worker-entry).
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
