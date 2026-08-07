/**
 * Excerpt from parent next.config.ts relevant to Dagsplan PDF export.
 * Merge into the host Next.js config when wiring the feature.
 */
const dagsplanNextConfigNotes = {
  serverExternalPackages: ["@prisma/client", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/dagsplan/[id]/pdf": [
      "./node_modules/@sparticuz/chromium/**",
      "./node_modules/puppeteer-core/**",
    ],
  },
  experimental: {
    serverActions: {
      /** Logo / parking / shot uploads */
      bodySizeLimit: "6mb",
    },
  },
};

export default dagsplanNextConfigNotes;
