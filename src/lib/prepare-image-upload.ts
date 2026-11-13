/**
 * Klargjør et bilde for opplasting i nettleseren: filer som allerede er små
 * nok og i et format serveren godtar sendes uendret. Andre (store skjermbilder,
 * HEIC i Safari osv.) tegnes på et canvas og eksporteres som JPG til de passer.
 * Kun for klientkode (bruker canvas / createImageBitmap).
 */

const SERVER_ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const DEFAULT_MAX_DIMENSION = 3200;
const QUALITY_STEPS = [0.88, 0.8, 0.7, 0.6];

export class ImagePrepareError extends Error {}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Faller tilbake til <img> under (f.eks. eldre Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "bilde";
  return `${base}.jpg`;
}

export async function prepareImageForUpload(
  file: File,
  opts: { maxBytes: number; maxDimension?: number },
): Promise<File> {
  if (file.size <= opts.maxBytes && SERVER_ACCEPTED_TYPES.has(file.type)) {
    return file;
  }

  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await decode(file);
  } catch {
    throw new ImagePrepareError(
      "Kunne ikke lese bildet. Lagre det som JPG eller PNG og prøv igjen.",
    );
  }

  let maxDimension = opts.maxDimension ?? DEFAULT_MAX_DIMENSION;
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    // JPG har ikke gjennomsiktighet — hvit bakgrunn i stedet for svart.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToJpeg(canvas, quality);
      if (blob && blob.size <= opts.maxBytes) {
        if ("close" in source && typeof source.close === "function") source.close();
        return new File([blob], jpegName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
    maxDimension = Math.round(Math.max(width, height) * 0.75);
  }

  if ("close" in source && typeof source.close === "function") source.close();
  throw new ImagePrepareError("Bildet er for stort og kunne ikke gjøres mindre.");
}
