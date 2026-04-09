/**
 * pdf.js (via pdf-parse) forventer nettleser-API-er som DOMMatrix, Path2D, ImageData.
 * I Node / Vercel finnes de ikke — sett før `pdf-parse` lastes (bruk dynamisk import).
 */
import DOMMatrixShim from "dommatrix";

const g = globalThis as typeof globalThis & {
  DOMMatrix?: typeof DOMMatrix;
  Path2D?: typeof Path2D;
  ImageData?: typeof ImageData;
};

if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = DOMMatrixShim as unknown as typeof DOMMatrix;
}

/** pdf.js-advarsler / enkel Path2D-bruk uten full canvas på server. */
if (typeof g.Path2D === "undefined") {
  g.Path2D = class Path2DPolyfill {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_path?: Path2D | string) {}
    addPath() {}
    arc() {}
    arcTo() {}
    bezierCurveTo() {}
    closePath() {}
    ellipse() {}
    lineTo() {}
    moveTo() {}
    quadraticCurveTo() {}
    rect() {}
  } as unknown as typeof Path2D;
}

/** Minimalt ImageData for polyfill-advarsler; tekstuttrekk trenger normalt ikke ekte piksler. */
if (typeof g.ImageData === "undefined") {
  g.ImageData = class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(
      swOrData: number | Uint8ClampedArray,
      sh?: number,
      third?: number | ImageDataSettings,
    ) {
      if (swOrData instanceof Uint8ClampedArray) {
        this.data = swOrData;
        this.width = sh ?? 0;
        this.height = typeof third === "number" ? third : 0;
      } else {
        this.width = swOrData;
        this.height = sh ?? 1;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  } as unknown as typeof ImageData;
}

export {};
