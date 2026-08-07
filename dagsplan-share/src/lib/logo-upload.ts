import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type LogoEntity =
  | "customer"
  | "agency"
  | "dagsplanAgency"
  | "dagsplanClient"
  | "dagsplanParking"
  | "dagsplanScheduleShot";

/** Lokale opplastinger under /uploads/ eller Vercel Blob-URLer. */
export function isPublicUploadPath(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/")) return true;
  return isVercelBlobUrl(url);
}

function isVercelBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Fjerner fil (lokal public/ eller Vercel Blob) hvis stien er en opplasting vi eier. */
export async function removePublicUploadFile(
  publicPath: string | null | undefined,
): Promise<void> {
  if (!publicPath) return;
  if (isVercelBlobUrl(publicPath)) {
    try {
      await del(publicPath);
    } catch {
      // finnes ikke eller allerede slettet
    }
    return;
  }
  if (!isPublicUploadPath(publicPath)) return;
  const rel = publicPath.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  try {
    await unlink(abs);
  } catch {
    // fil finnes ikke — ignorer
  }
}

export async function saveUploadedLogo(
  file: File,
  entity: LogoEntity,
  entityId: string,
  options?: { maxBytes?: number },
): Promise<{ ok: true; publicPath: string } | { ok: false; error: string }> {
  const maxBytes = options?.maxBytes ?? MAX_BYTES;
  if (!file || file.size === 0) {
    return { ok: false, error: "Ingen fil valgt" };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, error: `Filen er for stor (maks ${mb} MB)` };
  }
  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      error: "Tillatte formater: PNG, JPG, SVG, WebP, GIF",
    };
  }
  const ext = MIME_TO_EXT[mime] ?? "bin";
  const subParts =
    entity === "customer"
      ? (["customers"] as const)
      : entity === "agency"
        ? (["agencies"] as const)
        : entity === "dagsplanAgency"
          ? (["dagsplan", "agency"] as const)
          : entity === "dagsplanClient"
            ? (["dagsplan", "client"] as const)
            : entity === "dagsplanScheduleShot"
              ? (["dagsplan", "schedule-shot"] as const)
              : (["dagsplan", "parking"] as const);
  const name = `${entityId}-${randomBytes(8).toString("hex")}.${ext}`;
  const urlSub = subParts.join("/");

  const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  if (useBlob) {
    const pathname = `uploads/${urlSub}/${name}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { ok: true, publicPath: blob.url };
  }

  if (process.env.VERCEL) {
    return {
      ok: false,
      error:
        "Logo-opplasting på Vercel krever Vercel Blob: legg til Blob i prosjektet (Storage) slik at BLOB_READ_WRITE_TOKEN settes.",
    };
  }

  const dir = path.join(process.cwd(), "public", "uploads", ...subParts);
  await mkdir(dir, { recursive: true });
  const abs = path.join(dir, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buf);
  return { ok: true, publicPath: `/uploads/${urlSub}/${name}` };
}
