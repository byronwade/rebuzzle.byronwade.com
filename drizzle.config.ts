import type { Config } from "drizzle-kit"

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
} satisfies Config
