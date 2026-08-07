/**
 * Subset of dashboard `src/lib/utils.ts` used by Dagsplan.
 * Unrelated helpers (payroll labels, rates, project list sort) were omitted.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
  }).format(date);
}

const PDF_MONTH_SLUG = [
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

/** Calendar day slug in Europe/Oslo, e.g. «30mars». Shared naming with payroll PDF helpers in the full app. */
export function formatPayrollPdfDateSlug(date: Date): string {
  const s = date.toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
  const parts = s.split("-").map(Number);
  const day = parts[2];
  const monthIndex = parts[1] - 1;
  if (!day || monthIndex < 0 || monthIndex > 11) return "ukjent";
  return `${day}${PDF_MONTH_SLUG[monthIndex]}`;
}

/** Allow spaces and « - »; strip characters invalid in filenames. */
export function sanitizePayrollPdfFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || "lonningsliste.pdf"
  );
}

/** Basename without .pdf for dagsplan PDF (title + date slug). */
export function buildDagsplanPdfBasename(
  title: string,
  shootDate: Date,
): string {
  const t = title.trim() || "dagsplan";
  return `${t} - ${formatPayrollPdfDateSlug(shootDate)}`;
}
