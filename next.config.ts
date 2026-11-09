import type { NextConfig } from "next";

const DESK_SECTIONS = [
  "projects",
  "crew",
  "kunder",
  "byra",
  "brukertilgang",
  "dagsplaner",
  "callsheets",
  "design",
];

/** Planner er en egen app (wrapup-planner) som kjører med basePath /planner. */
const PLANNER_ORIGIN = (process.env.WRAPUP_PLANNER_ORIGIN || "https://wrapup-planner.vercel.app").replace(/\/$/, "");

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    /** Ikke external: full bundle trengs for server actions som leser PDF (Vercel). */
    "puppeteer-core",
  ],
  outputFileTracingIncludes: {
    "/api/dagsplan/[id]/pdf": [
      "./node_modules/@sparticuz/chromium/**",
      "./node_modules/puppeteer-core/**",
    ],
    "/api/projects/[id]/lonningsliste/[listId]/pdf": [
      "./node_modules/@sparticuz/chromium/**",
      "./node_modules/puppeteer-core/**",
    ],
    /** Server action `parsePayrollContractPdf` — pdf-parse må med i Lambda. */
    "/desk/projects/[id]/lonningsliste/[listId]": [
      "./node_modules/pdf-parse/**",
      /** pdf.js worker må ligge på disk — `file:`-URL (ikke https worker på Node). */
      "./node_modules/pdfjs-dist/legacy/build/**",
      "./node_modules/dommatrix/**",
      "./node_modules/@napi-rs/canvas/**",
    ],
  },
  /**
   * Desk flyttet fra roten til /desk (startsiden ligger på /). Gamle lenker,
   * bokmerker og utskrifts-URL-er videresendes.
   */
  async redirects() {
    return DESK_SECTIONS.flatMap((section) => [
      { source: `/${section}`, destination: `/desk/${section}`, permanent: true },
      { source: `/${section}/:path*`, destination: `/desk/${section}/:path*`, permanent: true },
    ]);
  },
  /** wrapup.aparent.tv/planner/* → Planner-appen, så alle tjenestene deler domene og innloggingsøkt. */
  async rewrites() {
    return [
      { source: "/planner", destination: `${PLANNER_ORIGIN}/planner` },
      { source: "/planner/:path*", destination: `${PLANNER_ORIGIN}/planner/:path*` },
    ];
  },
  experimental: {
    serverActions: {
      /** Logo-opplasting + PDF crew-import */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
