import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ||                     // untuk lokal/dev
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||    // serverless optimal
  process.env.NETLIFY_DATABASE_URL;               // fallback

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL atau NETLIFY_DATABASE_URL_UNPOOLED (atau NETLIFY_DATABASE_URL) wajib diset"
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});

