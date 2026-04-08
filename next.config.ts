import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "pdf-parse",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  experimental: {
    serverActions: {
      /** Logo-opplasting + PDF crew-import */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
