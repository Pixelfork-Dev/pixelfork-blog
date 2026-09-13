import "server-only";

import { eq, sql } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { db, schema } from "@/db";

/** Normalizes "/Posts/Old-Slug/" → "/posts/old-slug". */
export function normalizePath(path: string) {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]).replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return (clean.startsWith("/") ? clean : `/${clean}`).toLowerCase() || "/";
}

/**
 * Call instead of notFound() on public pages: if the URL moved (changed slug or a manual redirect),
 * send a permanent redirect so visitors and search rankings follow; otherwise render the 404.
 * Only runs for URLs that don't exist, so normal page views never touch the redirects table.
 */
export async function redirectOrNotFound(path: string): Promise<never> {
  const from = normalizePath(path);
  const row = await db.query.redirects.findFirst({ where: eq(schema.redirects.fromPath, from) }).catch(() => undefined);
  if (row && row.toPath !== from) {
    await db
      .update(schema.redirects)
      .set({ hits: sql`${schema.redirects.hits} + 1`, lastHitAt: new Date() })
      .where(eq(schema.redirects.id, row.id))
      .catch(() => undefined);
    permanentRedirect(row.toPath);
  }
  notFound();
}
