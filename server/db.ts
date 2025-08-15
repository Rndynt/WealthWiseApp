import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  // For migration purposes, set a temporary database URL
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/finance_app";
  console.log("⚠️  Using temporary DATABASE_URL for migration - database connection may fail");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });