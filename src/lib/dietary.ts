import type { DietaryPreference } from "@prisma/client";

const labels: Record<DietaryPreference, string> = {
  none: "Ingen",
  vegetarian: "Vegetar",
  vegan: "Vegan",
};

export function dietaryLabel(v: DietaryPreference): string {
  return labels[v] ?? v;
}

/** Tabellcelle på lønningsliste / PDF — «—» når ingen spesialkost. */
export function payrollDietaryCell(
  v: DietaryPreference | null | undefined,
): string {
  if (!v || v === "none") return "—";
  return dietaryLabel(v);
}
