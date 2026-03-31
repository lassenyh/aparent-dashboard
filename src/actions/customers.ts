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

const customerSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  logoUrl: z.string().optional(),
});

function getLogoFile(formData: FormData): File | null {
  const f = formData.get("logoFile");
  if (f instanceof File && f.size > 0) return f;
  return null;
}

export async function getCustomersList() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projects: true } },
    },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { projects: true } },
    },
  });
}

export async function getCustomerOptions() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createCustomer(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  };
  const parsed = customerSchema.safeParse({
    ...raw,
    logoUrl: raw.logoUrl.trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }
  const d = parsed.data;
  const logoFile = getLogoFile(formData);

  const c = await prisma.customer.create({
    data: {
      name: d.name.trim(),
      logoUrl: null,
    },
  });

  if (logoFile) {
    const saved = await saveUploadedLogo(logoFile, "customer", c.id);
    if (!saved.ok) {
      await prisma.customer.delete({ where: { id: c.id } });
      return { error: saved.error };
    }
    await prisma.customer.update({
      where: { id: c.id },
      data: { logoUrl: saved.publicPath },
    });
  } else if (d.logoUrl?.trim()) {
    await prisma.customer.update({
      where: { id: c.id },
      data: { logoUrl: d.logoUrl.trim() },
    });
  }

  revalidatePath("/kunder");
  redirect(`/kunder/${c.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  };
  const parsed = customerSchema.safeParse({
    ...raw,
    logoUrl: raw.logoUrl.trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
  }
  const d = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return { error: "Kunde ikke funnet" };

  const logoFile = getLogoFile(formData);
  const logoUrlFromForm = String(formData.get("logoUrl") ?? "").trim();

  if (logoFile) {
    const saved = await saveUploadedLogo(logoFile, "customer", id);
    if (!saved.ok) return { error: saved.error };
    if (isPublicUploadPath(existing.logoUrl)) {
      await removePublicUploadFile(existing.logoUrl);
    }
    await prisma.customer.update({
      where: { id },
      data: {
        name: d.name.trim(),
        logoUrl: saved.publicPath,
      },
    });
  } else {
    const nextUrl = logoUrlFromForm || null;
    if (isPublicUploadPath(existing.logoUrl) && nextUrl !== existing.logoUrl) {
      await removePublicUploadFile(existing.logoUrl);
    }
    await prisma.customer.update({
      where: { id },
      data: {
        name: d.name.trim(),
        logoUrl: nextUrl,
      },
    });
  }

  revalidatePath("/kunder");
  revalidatePath(`/kunder/${id}`);
  revalidatePath("/");
  return null;
}

export async function deleteCustomer(id: string) {
  const row = await prisma.customer.findUnique({ where: { id } });
  if (row?.logoUrl) await removePublicUploadFile(row.logoUrl);
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/kunder");
  revalidatePath("/");
  redirect("/kunder");
}
