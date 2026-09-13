import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizePath } from "@/lib/redirects";

type Executor = Pick<typeof db, "insert" | "update" | "delete">;

/**
 * Record that a public URL moved (e.g. a live post's slug changed) as a permanent redirect.
 * Keeps redirects one hop long: anything that pointed at the old URL now points at the new one.
 */
export async function recordMove(from: string, to: string, exec: Executor = db) {
  const fromPath = normalizePath(from);
  const toPath = normalizePath(to);
  if (fromPath === toPath) return;

  // Flatten chains: A → from becomes A → to.
  await exec.update(schema.redirects).set({ toPath }).where(eq(schema.redirects.toPath, fromPath));
  // The destination is a real page again, so it can't also be a redirect source.
  await exec.delete(schema.redirects).where(eq(schema.redirects.fromPath, toPath));
  await exec
    .insert(schema.redirects)
    .values({ fromPath, toPath, source: "auto" })
    .onConflictDoUpdate({ target: schema.redirects.fromPath, set: { toPath, source: "auto" } });
}

/** A URL now has real content (new post/tag/author with that slug): drop any redirect away from it. */
export async function releasePath(path: string, exec: Executor = db) {
  await exec.delete(schema.redirects).where(eq(schema.redirects.fromPath, normalizePath(path)));
}
