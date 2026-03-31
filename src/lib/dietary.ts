import type { DietaryPreference } from "@prisma/client";

const labels: Record<DietaryPreference, string> = {
  none: "Ingen",
  vegetarian: "Vegetar",
  vegan: "Vegan",
};

export function dietaryLabel(v: DietaryPreference): string {
  return labels[v] ?? v;
}
