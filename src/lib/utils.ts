import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRate(
  amount: unknown,
  rateType: "day" | "hour" | null | undefined,
): string {
  if (amount == null) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
  if (!rateType) return formatted;
  return `${formatted} / ${rateType === "day" ? "dag" : "time"}`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
  }).format(date);
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Internt navn / prosjektnummer som prefiks foran prosjektnavn når det finnes og ikke er likt navnet. */
export function formatProjectDisplayName(project: {
  name: string;
  internalTitle?: string | null;
}): string {
  const name = project.name.trim();
  const internal = project.internalTitle?.trim();
  if (!internal || internal === name) return name;
  return `${internal} · ${name}`;
}

/** Lønningsliste — felt «Prosjekt»: Prosjektnr - Kunde - Prosjektnavn (`internalTitle` = prosjektnr). */
export function formatPayrollProjectLabel(project: {
  name: string;
  internalTitle?: string | null;
  customer?: { name: string } | null;
}): string {
  const nr = project.internalTitle?.trim() || "—";
  const kunde = project.customer?.name?.trim() || "—";
  const navn = project.name.trim() || "—";
  return `${nr} - ${kunde} - ${navn}`;
}

const PAYROLL_PDF_MONTH_SLUG = [
  "jan",
  "feb",
  "mars",
  "apr",
  "mai",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "des",
] as const;

/** Nedlasting av lønningsliste-PDF, f.eks. «30mars» (kalenderdag i Europe/Oslo). */
export function formatPayrollPdfDateSlug(date: Date): string {
  const s = date.toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
  const parts = s.split("-").map(Number);
  const day = parts[2];
  const monthIndex = parts[1] - 1;
  if (!day || monthIndex < 0 || monthIndex > 11) return "ukjent";
  return `${day}${PAYROLL_PDF_MONTH_SLUG[monthIndex]}`;
}

/** Basenavn uten .pdf: «102 - Kiwi - Fotball VM - 30mars» (ikke listetittel). */
export function buildPayrollPdfDownloadBasename(
  project: {
    name: string;
    internalTitle?: string | null;
    customer?: { name: string } | null;
  },
  documentSavedAt: Date | null,
  listUpdatedAtMs: number,
): string {
  const d = documentSavedAt ?? new Date(listUpdatedAtMs);
  return `${formatPayrollProjectLabel(project)} - ${formatPayrollPdfDateSlug(d)}`;
}

/** Tillater mellomrom og « - »; fjerner tegn som er ugyldige i filnavn. */
export function sanitizePayrollPdfFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || "lonningsliste.pdf"
  );
}

/** Sorteringsnøkkel for prosjektliste: prosjektnummer (`internalTitle`), ellers navn. */
export function projectListSortKey(project: {
  name: string;
  internalTitle?: string | null;
}): string {
  const n = project.internalTitle?.trim();
  if (n) return n;
  return project.name.trim();
}
