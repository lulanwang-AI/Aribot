import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // The EMR keeps its own schema in the same database. Only manage the tables
  // declared here so a push never offers to drop the EMR's.
  tablesFilter: ["users", "demo_requests", "amr_cases", "ari_audit_log", "ari_memory", "session"],
});
