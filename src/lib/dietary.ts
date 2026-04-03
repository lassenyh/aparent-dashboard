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

/**
 * Én linje til crewliste / delt visning: kosthold (hvis ikke «none») og fritekst allergier.
 * `null` når ingenting er satt — brukes til å skjule kolonne for hele listen.
 */
export function formatCrewListDietaryAllergies(
  dietaryPreference: DietaryPreference,
  allergies: string | null | undefined,
): string | null {
  const parts: string[] = [];
  if (dietaryPreference && dietaryPreference !== "none") {
    parts.push(dietaryLabel(dietaryPreference));
  }
  const a = allergies?.trim();
  if (a) parts.push(a);
  return parts.length > 0 ? parts.join(" · ") : null;
}
