import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "pdf-parse",
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
  },
  experimental: {
    serverActions: {
      /** Logo-opplasting + PDF crew-import */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
