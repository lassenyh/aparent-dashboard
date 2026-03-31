"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseCrewListPlainText } from "@/lib/crew-list-import-parse";
import type { CrewImportDraftRow } from "@/lib/crew-list-import-parse";
import { computeFullName } from "@/lib/person";
import { extractTextFromPdfBuffer } from "@/lib/pdf-text";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_PASTE_CHARS = 600_000;
const MAX_BATCH_ROWS = 300;

/** Tillater tomme navn i payload (uvalgte/uferdige rader); validering skjer ved import av valgte rader. */
function strOrEmpty(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

const batchRowSchema = z.object({
  firstName: z.preprocess(strOrEmpty, z.string()),
  lastName: z.preprocess(strOrEmpty, z.string()),
  email: z.preprocess(strOrEmpty, z.string()),
  phone: z.preprocess(strOrEmpty, z.string()),
  roles: z.preprocess(strOrEmpty, z.string()),
  selected: z.preprocess(
    (v) => v === true || v === "true",
    z.boolean(),
  ),
});

export type CrewListImportBatchResult = {
  created: number;
  skippedDuplicates: number;
  skippedUnselected: number;
  errors: string[];
};

async function findExistingPerson(
  email: string | null | undefined,
  fullName: string,
) {
  const e = email?.trim();
  if (e) {
    const byEmail = await prisma.person.findFirst({
      where: { email: { equals: e, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) return byEmail;
  }
  return prisma.person.findFirst({
    where: { fullName: { equals: fullName.trim(), mode: "insensitive" } },
    select: { id: true },
  });
}

/** Leser PDF og returnerer utkast-rader (samme parser som limt tekst). */
export async function parseCrewListPdf(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true; rows: CrewImportDraftRow[]; textPreview: string }
  | { ok: false; error: string }
> {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Velg en PDF-fil." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: `PDF er for stor (maks ${MAX_PDF_BYTES / 1024 / 1024} MB).` };
  }

  let text: string;
  try {
    const buf = await file.arrayBuffer();
    text = await extractTextFromPdfBuffer(buf);
  } catch {
    return {
      ok: false,
      error: "Kunne ikke lese PDF. Prøv å lime inn tekst manuelt i stedet.",
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      error:
        "Fant ingen tekst i PDF-en (kanskje skannet bilde?). Lim inn tekst fra listen manuelt, eller eksporter som tekstbasert PDF.",
    };
  }

  const rows = parseCrewListPlainText(trimmed);
  if (!rows.length) {
    return {
      ok: false,
      error:
        "Fant ingen rader vi kunne tolke. For dagsplan: bruk tekstbasert PDF med «CREW INFO», eller lim inn utdrag fra PDF. Sjekk også at mobil står med 8 siffer (med eller uten mellomrom) før tid på sett.",
    };
  }

  return {
    ok: true,
    rows,
    textPreview: trimmed.slice(0, 1200),
  };
}

/** Parser limt tekst uten PDF. */
export async function parseCrewListPastedText(
  raw: string,
): Promise<
  | { ok: true; rows: CrewImportDraftRow[]; textPreview: string }
  | { ok: false; error: string }
> {
  if (raw.length > MAX_PASTE_CHARS) {
    return { ok: false, error: "Teksten er for lang." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Lim inn tekst fra crewlisten." };
  }
  const rows = parseCrewListPlainText(trimmed);
  if (!rows.length) {
    return {
      ok: false,
      error:
        "Fant ingen rader. Sjekk at hver person står på egen linje eller i tabellkolonner.",
    };
  }
  return {
    ok: true,
    rows,
    textPreview: trimmed.slice(0, 1200),
  };
}

export async function batchImportCrewListRows(
  rows: unknown,
): Promise<CrewListImportBatchResult> {
  const parsed = z.array(batchRowSchema).safeParse(rows);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const detail = issue
      ? `${issue.path.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`
      : "Ukjent valideringsfeil";
    return {
      created: 0,
      skippedDuplicates: 0,
      skippedUnselected: 0,
      errors: [
        `Kunne ikke lese importdata (${detail}). Prøv igjen eller last siden på nytt.`,
      ],
    };
  }

  let data = parsed.data;
  if (data.length > MAX_BATCH_ROWS) {
    data = data.slice(0, MAX_BATCH_ROWS);
  }

  let created = 0;
  let skippedDuplicates = 0;
  let skippedUnselected = 0;
  const errors: string[] = [];

  for (const row of data) {
    if (!row.selected) {
      skippedUnselected += 1;
      continue;
    }

    const firstName = row.firstName.trim();
    const lastName = row.lastName.trim();
    if (!firstName || !lastName) {
      errors.push(`Hoppet over rad uten fullt navn: «${firstName} ${lastName}».`);
      continue;
    }

    const fullName = computeFullName(firstName, lastName);
    const email = row.email?.trim() || null;
    const existing = await findExistingPerson(email, fullName);
    if (existing) {
      skippedDuplicates += 1;
      continue;
    }

    const roles = row.roles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await prisma.person.create({
        data: {
          firstName,
          lastName,
          fullName,
          email: email || null,
          phone: row.phone?.trim() || null,
          city: null,
          roles,
          defaultRate: null,
          rateType: "day",
          dietaryPreference: "none",
          allergies: null,
          isActive: true,
        },
      });
      created += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ukjent feil";
      errors.push(`Kunne ikke opprette ${fullName}: ${msg}`);
    }
  }

  if (created > 0) {
    revalidatePath("/crew");
  }

  return {
    created,
    skippedDuplicates,
    skippedUnselected,
    errors,
  };
}
