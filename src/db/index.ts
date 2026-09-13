import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * One Postgres client for everything: Supabase Postgres in production (Vercel), the local PGlite
 * server in development (`npm run db:local`). Both speak the regular Postgres protocol.
 */

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (and run `npm run db:local`).");
  }
  const url = new URL(connectionString);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  // pg lets sslmode in the URL override the ssl option below, so TLS is configured here only.
  for (const param of ["sslmode", "sslrootcert", "supa"]) url.searchParams.delete(param);
  return new Pool({
    connectionString: url.toString(),
    max: isLocal ? 4 : 5,
    ssl: isLocal ? false : sslOptions(),
    idleTimeoutMillis: 10_000,
    // Fail fast with an error instead of hanging a build or request when the database can't be reached.
    connectionTimeoutMillis: 15_000,
  });
}

/**
 * Supabase signs its database certificates with its own CA. Set DATABASE_CA_CERT to that certificate
 * (Supabase → Project Settings → Database → SSL certificate) to verify the server; without it the
 * connection is still encrypted but the certificate isn't verified.
 */
function sslOptions() {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

// Reuse the pool across hot reloads in dev and across invocations of a warm serverless function.
const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
