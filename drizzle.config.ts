import { defineConfig } from "drizzle-kit";

/**
 * `pnpm db:generate` writes SQL to db/migrations (no database needed).
 * `pnpm db:migrate` applies it using DATABASE_URL (Supabase → Project Settings → Database →
 * connection string, "Session pooler" URI).
 */
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Supabase owns these schemas; never diff or drop them.
  schemaFilter: ["public"],
  entities: { roles: { provider: "supabase" } },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
