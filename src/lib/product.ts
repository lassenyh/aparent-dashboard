/**
 * WrapUp er plattformen; tjenestene er ordene etter delelinjen i låsen
 * (`wrapup ···▪ | desk`). Denne appen er produksjonsbordet — prosjekter,
 * crew, dagsplan og lønningslister.
 *
 * wrapup-temaet (papir/blekk/segl) og navnet «WrapUp Desk» er standard.
 * Rollback til det gamle Aparent-uttrykket (mørk sidemeny, gull innlogging)
 * krever ingen deploy — sett NEXT_PUBLIC_THEME=legacy der miljøvariabler
 * styres, og appen faller tilbake uten kodeendring.
 */
export const WRAPUP_THEME_ACTIVE = process.env.NEXT_PUBLIC_THEME !== "legacy";

export const PRODUCT_PLATFORM = "WrapUp";

export const PRODUCT_SERVICES = ["desk", "sign", "planner", "rights", "payroll"] as const;
export type ProductService = (typeof PRODUCT_SERVICES)[number];

/** Tjenesten denne appen ER. */
export const PRODUCT_SERVICE: ProductService = "desk";

export const PRODUCT_NAME = WRAPUP_THEME_ACTIVE
  ? "WrapUp Desk"
  : "Aparent Dashboard";

/** Fanetittel. Nettleserfaner kan ikke tegne CSS-hårlinjen, så `|` er delelinjen. */
export const PRODUCT_TAB_TITLE = WRAPUP_THEME_ACTIVE
  ? `wrapup | ${PRODUCT_SERVICE}`
  : PRODUCT_NAME;

/**
 * Tjenestene i WrapUp-familien, med fargen firkanten og tjenesteordet har i
 * hver av dem, og hvor de bor. `url: null` = denne appen, eller ikke lansert.
 * Adressene kan overstyres med NEXT_PUBLIC_WRAPUP_SIGN_URL / NEXT_PUBLIC_WRAPUP_PLANNER_URL.
 */
export const SERVICE_META: Record<
  ProductService,
  { label: string; color: string; url: string | null; status: "live" | "soon" }
> = {
  desk: { label: "Produksjon, crew og dagsplaner", color: "#2f5d4a", url: null, status: "live" },
  sign: {
    label: "Kontrakter og signering",
    color: "#7a2e2a",
    url: process.env.NEXT_PUBLIC_WRAPUP_SIGN_URL || "https://wrapup-sign.vercel.app",
    status: "live",
  },
  planner: {
    label: "Fremdriftsplaner",
    color: "#2b4c7e",
    /* Planner proxyes under /planner på samme domene (se rewrites i next.config.ts). */
    url: process.env.NEXT_PUBLIC_WRAPUP_PLANNER_URL || "/planner",
    status: "live",
  },
  rights: { label: "Rettigheter og lisenser", color: "#8a8474", url: null, status: "soon" },
  payroll: { label: "Lønn og honorar", color: "#8a8474", url: null, status: "soon" },
};
