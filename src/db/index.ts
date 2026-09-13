import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * One Postgres client for everything: Neon in production (Vercel), the local PGlite
 * server in development (`npm run db:local`). Both speak the regular Postgres protocol.
 */

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (and run `npm run db:local`).");
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  return new Pool({
    connectionString,
    max: isLocal ? 4 : 5,
    ssl: isLocal ? false : { rejectUnauthorized: true },
    idleTimeoutMillis: 10_000,
  });
}

// Reuse the pool across hot reloads in dev and across invocations of a warm serverless function.
const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
