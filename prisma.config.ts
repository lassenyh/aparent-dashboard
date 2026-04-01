import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 fjerner `package.json#prisma`. Seed og CLI-oppsett ligger her.
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
