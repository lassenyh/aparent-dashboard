"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  isPublicUploadPath,
  removePublicUploadFile,
  saveUploadedLogo,
} from "@/lib/logo-upload";

const agencySchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  orgNumber: z.string().optional(),
  logoUrl: z.string().optional(),
});

function getLogoFile(formData: FormData): File | null {
  const f = formData.get("logoFile");
  if (f instanceof File && f.size > 0) return f;
  return null;
}

export async function getAgenciesList() {
  return prisma.agency.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projects: true } },
    },
  });
}

export async function getAgencyById(id: string) {
  return prisma.agency.findUnique({
    where: { id },
    include: {
      _count: { select: { projects: true } },
    },
  });
}

export async function getAgencyOptions() {
  return prisma.agency.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createAgency(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    orgNumber: String(formData.get("orgNumber") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  };
  const parsed = agencySchema.safeParse({
    ...raw,
    orgNumber: raw.orgNumber.trim() || undefined,
    logoUrl: raw.logoUrl.trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }
  const d = parsed.data;
  const logoFile = getLogoFile(formData);

  const a = await prisma.agency.create({
    data: {
      name: d.name.trim(),
      orgNumber: d.orgNumber?.trim() || null,
      logoUrl: null,
    },
  });

  if (logoFile) {
    const saved = await saveUploadedLogo(logoFile, "agency", a.id);
    if (!saved.ok) {
      await prisma.agency.delete({ where: { id: a.id } });
      return { error: saved.error };
    }
    await prisma.agency.update({
      where: { id: a.id },
      data: { logoUrl: saved.publicPath },
    });
  } else if (d.logoUrl?.trim()) {
    await prisma.agency.update({
      where: { id: a.id },
      data: { logoUrl: d.logoUrl.trim() },
    });
  }

  revalidatePath("/byra");
  redirect(`/byra/${a.id}`);
}

export async function updateAgency(
  id: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    orgNumber: String(formData.get("orgNumber") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  };
  const parsed = agencySchema.safeParse({
    ...raw,
    orgNumber: raw.orgNumber.trim() || undefined,
    logoUrl: raw.logoUrl.trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }
  const d = parsed.data;

  const existing = await prisma.agency.findUnique({ where: { id } });
  if (!existing) return { error: "Byrå ikke funnet" };

  const logoFile = getLogoFile(formData);
  const logoUrlFromForm = String(formData.get("logoUrl") ?? "").trim();

  if (logoFile) {
    const saved = await saveUploadedLogo(logoFile, "agency", id);
    if (!saved.ok) return { error: saved.error };
    if (isPublicUploadPath(existing.logoUrl)) {
      await removePublicUploadFile(existing.logoUrl);
    }
    await prisma.agency.update({
      where: { id },
      data: {
        name: d.name.trim(),
        orgNumber: d.orgNumber?.trim() || null,
        logoUrl: saved.publicPath,
      },
    });
  } else {
    const nextUrl = logoUrlFromForm || null;
    if (isPublicUploadPath(existing.logoUrl) && nextUrl !== existing.logoUrl) {
      await removePublicUploadFile(existing.logoUrl);
    }
    await prisma.agency.update({
      where: { id },
      data: {
        name: d.name.trim(),
        orgNumber: d.orgNumber?.trim() || null,
        logoUrl: nextUrl,
      },
    });
  }

  revalidatePath("/byra");
  revalidatePath(`/byra/${id}`);
  revalidatePath("/");
  return null;
}

export async function deleteAgency(id: string) {
  const row = await prisma.agency.findUnique({ where: { id } });
  if (row?.logoUrl) await removePublicUploadFile(row.logoUrl);
  await prisma.agency.delete({ where: { id } });
  revalidatePath("/byra");
  revalidatePath("/");
  redirect("/byra");
}
