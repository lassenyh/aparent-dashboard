import type { NextConfig } from "next";

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
    "/projects/[id]/lonningsliste/[listId]": [
      "./node_modules/pdf-parse/**",
    ],
  },
  experimental: {
    serverActions: {
      /** Logo-opplasting + PDF crew-import */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
