import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CUSTOMER_FILES: Record<string, string> = {
  Gilde: "public/Kundelogoer/Gilde_standard.png",
  DNB: "public/Kundelogoer/DNB.png",
};

const AGENCY_FILES: Record<string, string> = {
  "Alexander Reklamebyrå": "public/Byrålogoer/Alexander Reklamebyrå_sort.png",
  Anorak: "public/Byrålogoer/anorak-logo.png",
  "Pulse Communications": "public/Byrålogoer/Pulse_white.png",
  TRY: "public/Byrålogoer/Try_original_sort.png",
};

async function blobExists(url: string | null): Promise<boolean> {
  if (!url?.includes("blob.vercel-storage.com")) return false;
  const res = await fetch(url, { method: "HEAD" });
  return res.ok;
}

async function uploadFile(localPath: string, blobPath: string): Promise<string> {
  const abs = path.join(process.cwd(), localPath);
  const file = await readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".svg"
        ? "image/svg+xml"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
  const blob = await put(blobPath, file, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });
  return blob.url;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN mangler.");
  }

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, logoUrl: true },
  });
  for (const customer of customers) {
    const localPath = CUSTOMER_FILES[customer.name];
    if (!localPath) continue;
    if (await blobExists(customer.logoUrl)) {
      console.log(`[ok] customer ${customer.name}`);
      continue;
    }
    const next = await uploadFile(
      localPath,
      `uploads/customers/${customer.id}-${Date.now()}.png`,
    );
    await prisma.customer.update({
      where: { id: customer.id },
      data: { logoUrl: next },
    });
    console.log(`[restored] customer ${customer.name}`);
  }

  const agencies = await prisma.agency.findMany({
    select: { id: true, name: true, logoUrl: true },
  });
  for (const agency of agencies) {
    const localPath = AGENCY_FILES[agency.name];
    if (!localPath) continue;
    if (await blobExists(agency.logoUrl)) {
      console.log(`[ok] agency ${agency.name}`);
      continue;
    }
    const next = await uploadFile(
      localPath,
      `uploads/agencies/${agency.id}-${Date.now()}.png`,
    );
    await prisma.agency.update({
      where: { id: agency.id },
      data: { logoUrl: next },
    });
    console.log(`[restored] agency ${agency.name}`);
  }

  const freshCustomers = await prisma.customer.findMany({
    select: { id: true, logoUrl: true },
  });
  const freshAgencies = await prisma.agency.findMany({
    select: { id: true, logoUrl: true },
  });
  const customersById = new Map(freshCustomers.map((x) => [x.id, x]));
  const agenciesById = new Map(freshAgencies.map((x) => [x.id, x]));
  const plans = await prisma.dagsplan.findMany({
    select: {
      id: true,
      title: true,
      agencyLogoUrl: true,
      clientLogoUrl: true,
      project: { select: { agencyId: true } },
    },
  });

  for (const plan of plans) {
    const data: { agencyLogoUrl?: string; clientLogoUrl?: string } = {};
    if (plan.agencyLogoUrl && !(await blobExists(plan.agencyLogoUrl))) {
      const match = /uploads\/agencies\/([a-z0-9]+)-/.exec(plan.agencyLogoUrl);
      const fromUrl = match ? agenciesById.get(match[1]) : undefined;
      const fromProject = plan.project.agencyId
        ? agenciesById.get(plan.project.agencyId)
        : undefined;
      const agency = fromUrl ?? fromProject;
      if (agency?.logoUrl && (await blobExists(agency.logoUrl))) {
        data.agencyLogoUrl = agency.logoUrl;
      }
    }
    if (plan.clientLogoUrl && !(await blobExists(plan.clientLogoUrl))) {
      const match = /uploads\/customers\/([a-z0-9]+)-/.exec(plan.clientLogoUrl);
      const customer = match ? customersById.get(match[1]) : undefined;
      if (customer?.logoUrl && (await blobExists(customer.logoUrl))) {
        data.clientLogoUrl = customer.logoUrl;
      }
    }
    if (Object.keys(data).length === 0) continue;
    await prisma.dagsplan.update({ where: { id: plan.id }, data });
    console.log(`[repointed] dagsplan ${plan.title}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Ferdig.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
