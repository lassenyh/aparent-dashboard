/**
 * pdf.js (via pdf-parse) forventer nettleser-API-er som DOMMatrix.
 * I Node / Vercel finnes de ikke — sett før `pdf-parse` lastes (bruk dynamisk import).
 */
import DOMMatrixShim from "dommatrix";

const g = globalThis as typeof globalThis & {
  DOMMatrix?: typeof DOMMatrix;
};

if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = DOMMatrixShim as unknown as typeof DOMMatrix;
}

export {};
