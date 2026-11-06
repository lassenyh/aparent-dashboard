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

export const PRODUCT_SERVICES = ["desk", "sign", "rights", "payroll"] as const;
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
