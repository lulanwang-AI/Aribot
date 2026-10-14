import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // The API server's tables (lib/db) live in the same database. Exclude them
  // so an EMR push never offers to drop them.
  tablesFilter: ["!users", "!demo_requests", "!amr_cases", "!ari_audit_log", "!ari_memory", "!session"],
});
