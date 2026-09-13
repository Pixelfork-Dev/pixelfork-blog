import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read Next's env files; load .env.local when present (Vercel injects env directly).
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
});
