import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/database/remote-schema.ts",
  out: "./drizzle/neon",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
