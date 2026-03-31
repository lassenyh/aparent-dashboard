import type { PayrollPageData } from "@/actions/payroll";

export type PayrollPageRow = PayrollPageData["rows"][number];

export type PayrollDisplayRow =
  | { kind: "banner"; segment: "crew" | "cast"; id: string }
  | { kind: "row"; row: PayrollPageRow };

/** Crew først, deretter cast — med tydelige overskrifter i PDF/utskrift. */
export function expandPayrollRowsForDisplay(
  rows: PayrollPageRow[],
): PayrollDisplayRow[] {
  const crew = rows.filter((r) => r.segment === "crew");
  const cast = rows.filter((r) => r.segment === "cast");
  const out: PayrollDisplayRow[] = [];
  if (crew.length) {
    out.push({ kind: "banner", segment: "crew", id: "__banner_crew" });
    for (const row of crew) out.push({ kind: "row", row });
  }
  if (cast.length) {
    out.push({ kind: "banner", segment: "cast", id: "__banner_cast" });
    for (const row of cast) out.push({ kind: "row", row });
  }
  return out;
}
