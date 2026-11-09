import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function isLocalUpload(url: string): boolean {
  return url.startsWith("/uploads/dagsplan/schedule-shot/");
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN mangler.");
  }

  const rows = await prisma.dagsplanScheduleEntry.findMany({
    where: { shotImageUrl: { startsWith: "/uploads/dagsplan/schedule-shot/" } },
    select: {
      id: true,
      shotImageUrl: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  const unique = new Map<string, { url: string; projectId: string }>();
  for (const row of rows) {
    if (!row.shotImageUrl || !isLocalUpload(row.shotImageUrl)) continue;
    unique.set(`${row.dagsplan.projectId}:${row.shotImageUrl}`, {
      url: row.shotImageUrl,
      projectId: row.dagsplan.projectId,
    });
  }

  for (const item of unique.values()) {
    const localPath = path.join(process.cwd(), "public", item.url.replace(/^\/+/, ""));
    await stat(localPath);
  }

  let migrated = 0;
  for (const item of unique.values()) {
    const localPath = path.join(process.cwd(), "public", item.url.replace(/^\/+/, ""));
    const pathname = item.url.replace(/^\/+/, "");
    const blob = await put(pathname, await readFile(localPath), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: contentType(localPath),
    });
    await prisma.$transaction(async (tx) => {
      const asset = await tx.dagsplanImageAsset.upsert({
        where: { projectId_url: { projectId: item.projectId, url: item.url } },
        create: {
          projectId: item.projectId,
          url: item.url,
          name: path.basename(localPath),
        },
        update: {},
      });
      await tx.dagsplanScheduleEntry.updateMany({
        where: {
          shotImageUrl: item.url,
          dagsplan: { projectId: item.projectId },
        },
        data: { shotImageUrl: blob.url, shotImageAssetId: asset.id },
      });
      await tx.dagsplanImageAsset.update({
        where: { id: asset.id },
        data: { url: blob.url },
      });
    });
    migrated += 1;
    console.log(`[migrated] ${item.url} -> ${blob.url}`);
  }
  const unlinked = await prisma.dagsplanScheduleEntry.findMany({
    where: { shotImageUrl: { not: null }, shotImageAssetId: null },
    select: {
      id: true,
      shotImageUrl: true,
      dagsplan: { select: { projectId: true } },
    },
  });
  for (const row of unlinked) {
    if (!row.shotImageUrl) continue;
    const asset = await prisma.dagsplanImageAsset.upsert({
      where: {
        projectId_url: {
          projectId: row.dagsplan.projectId,
          url: row.shotImageUrl,
        },
      },
      create: {
        projectId: row.dagsplan.projectId,
        url: row.shotImageUrl,
        name: path.basename(new URL(row.shotImageUrl).pathname),
      },
      update: {},
    });
    await prisma.dagsplanScheduleEntry.update({
      where: { id: row.id },
      data: { shotImageAssetId: asset.id },
    });
  }
  console.log(`Ferdig: ${migrated} unike bilder flyttet til Blob.`);
  console.log(`Koblet ${unlinked.length} eksisterende Blob-bilder til prosjektalbumet.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
