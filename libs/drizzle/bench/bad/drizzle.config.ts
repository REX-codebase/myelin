import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "pg",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
