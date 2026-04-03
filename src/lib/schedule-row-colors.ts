/** Normaliser til #RRGGBB eller tom streng (ingen farge). */
export function normalizeScheduleRowBgColor(raw: string | null | undefined): string {
  const t = raw?.trim() ?? "";
  if (!t) return "";
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(t);
  if (!m) return "";
  return `#${m[1].toLowerCase()}`;
}

/** Standard radfarge for «Call time» i timeplan (RGB 255, 237, 213). */
export const SCHEDULE_CALL_TIME_DEFAULT_ROW_BG = "#ffedd5";

/** Standard radfarge for «Wrap» i timeplan (RGB 178, 123, 123). */
export const SCHEDULE_WRAP_DEFAULT_ROW_BG = "#b27b7b";

/** Raske valg inspirert av typisk dagsplan / referanse (call sheet). */
export const SCHEDULE_ROW_COLOR_PRESETS: ReadonlyArray<{
  label: string;
  /** Tom = ingen bakgrunn (tabellstandard). */
  hex: string;
}> = [
  { label: "Standard", hex: "" },
  { label: "Soloppgang", hex: "#fce7f3" },
  { label: "Logistikk", hex: "#ffedd5" },
  { label: "Lunsj / pause", hex: "#e5e7eb" },
  { label: "Cast", hex: "#fef9c3" },
  { label: "Innspilling", hex: "#dcfce7" },
  { label: "Merk", hex: "#e0e7ff" },
  { label: "Is", hex: "#cffafe" },
];
