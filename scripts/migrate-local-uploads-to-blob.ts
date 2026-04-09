import "dotenv/config";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

type Row = { id: string; value: string | null };

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const CWD = process.cwd();

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function isLocalUploadPath(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().startsWith("/uploads/");
}

function toPublicAbsolutePath(localUploadPath: string): string {
  const rel = localUploadPath.replace(/^\/+/, "");
  return path.join(CWD, "public", rel);
}

function toBlobPath(model: string, field: string, id: string, sourcePath: string): string {
  const ext = path.extname(sourcePath).toLowerCase();
  const safeExt = ext || ".bin";
  return `uploads/migrated/${model}/${field}/${id}-${Date.now()}${safeExt}`;
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

async function migrateRows(opts: {
  model: string;
  field: string;
  rows: Row[];
  update: (id: string, nextValue: string) => Promise<void>;
}) {
  let migrated = 0;
  let missing = 0;
  let skipped = 0;

  for (const row of opts.rows) {
    if (!isLocalUploadPath(row.value)) {
      skipped += 1;
      continue;
    }

    const abs = toPublicAbsolutePath(row.value);
    try {
      await access(abs);
    } catch {
      missing += 1;
      console.warn(`[missing] ${opts.model}.${opts.field} ${row.id} -> ${row.value}`);
      continue;
    }

    if (DRY_RUN) {
      migrated += 1;
      console.log(`[dry-run] ${opts.model}.${opts.field} ${row.id} -> ${row.value}`);
      continue;
    }

    const blobPath = toBlobPath(opts.model, opts.field, row.id, abs);
    const file = await readFile(abs);
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: mimeFromPath(abs),
    });
    await opts.update(row.id, blob.url);
    migrated += 1;
    console.log(`[migrated] ${opts.model}.${opts.field} ${row.id} -> ${blob.url}`);
  }

  console.log(
    `[done] ${opts.model}.${opts.field} migrated=${migrated} missing=${missing} skipped=${skipped}`,
  );
}

async function main() {
  if (!DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN mangler. Sett token eller kjør med --dry-run.");
  }

  const agencies = await prisma.agency.findMany({
    select: { id: true, logoUrl: true },
  });
  await migrateRows({
    model: "agency",
    field: "logoUrl",
    rows: agencies.map((x) => ({ id: x.id, value: x.logoUrl })),
    update: async (id, nextValue) => {
      await prisma.agency.update({ where: { id }, data: { logoUrl: nextValue } });
    },
  });

  const customers = await prisma.customer.findMany({
    select: { id: true, logoUrl: true },
  });
  await migrateRows({
    model: "customer",
    field: "logoUrl",
    rows: customers.map((x) => ({ id: x.id, value: x.logoUrl })),
    update: async (id, nextValue) => {
      await prisma.customer.update({ where: { id }, data: { logoUrl: nextValue } });
    },
  });

  const dagsplaner = await prisma.dagsplan.findMany({
    select: { id: true, agencyLogoUrl: true, clientLogoUrl: true },
  });
  await migrateRows({
    model: "dagsplan",
    field: "agencyLogoUrl",
    rows: dagsplaner.map((x) => ({ id: x.id, value: x.agencyLogoUrl })),
    update: async (id, nextValue) => {
      await prisma.dagsplan.update({
        where: { id },
        data: { agencyLogoUrl: nextValue },
      });
    },
  });
  await migrateRows({
    model: "dagsplan",
    field: "clientLogoUrl",
    rows: dagsplaner.map((x) => ({ id: x.id, value: x.clientLogoUrl })),
    update: async (id, nextValue) => {
      await prisma.dagsplan.update({
        where: { id },
        data: { clientLogoUrl: nextValue },
      });
    },
  });

  const locations = await prisma.dagsplanLocation.findMany({
    select: { id: true, parkingImageUrl: true },
  });
  await migrateRows({
    model: "dagsplanLocation",
    field: "parkingImageUrl",
    rows: locations.map((x) => ({ id: x.id, value: x.parkingImageUrl })),
    update: async (id, nextValue) => {
      await prisma.dagsplanLocation.update({
        where: { id },
        data: { parkingImageUrl: nextValue },
      });
    },
  });

  const scheduleEntries = await prisma.dagsplanScheduleEntry.findMany({
    select: { id: true, shotImageUrl: true },
  });
  await migrateRows({
    model: "dagsplanScheduleEntry",
    field: "shotImageUrl",
    rows: scheduleEntries.map((x) => ({ id: x.id, value: x.shotImageUrl })),
    update: async (id, nextValue) => {
      await prisma.dagsplanScheduleEntry.update({
        where: { id },
        data: { shotImageUrl: nextValue },
      });
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log(DRY_RUN ? "Dry-run ferdig." : "Migrering ferdig.");
  })
  .catch(async (error) => {
    console.error("Migrering feilet:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
