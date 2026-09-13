import "server-only";

import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { UserRow } from "@/db/schema";
import { slugify } from "@/lib/slug";

/**
 * Who may sign in to /admin. Access is invite-only:
 *  - an existing, non-disabled user row with this email, or
 *  - an email listed in ADMIN_EMAILS (bootstraps the first admins).
 */

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function bootstrapAdmins() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${normalizeEmail(email)}` });
}

async function uniqueAuthorSlug(base: string) {
  const root = slugify(base) || "author";
  const taken = await db
    .select({ slug: schema.authors.slug })
    .from(schema.authors)
    .where(like(schema.authors.slug, `${root}%`));
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(root)) return root;
  let n = 2;
  while (set.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

/**
 * Called on every sign-in. Returns the user when access is allowed (after syncing their
 * Google name/avatar and making sure they have an author profile), or null to deny.
 */
export async function resolveSignIn(profile: { email: string; name?: string | null; image?: string | null }): Promise<UserRow | null> {
  const email = normalizeEmail(profile.email);
  let user = await findUserByEmail(email);

  if (!user) {
    if (!bootstrapAdmins().includes(email)) return null;
    [user] = await db.insert(schema.users).values({ email, role: "admin" }).returning();
  }
  if (user.disabledAt) return null;

  const name = profile.name?.trim() || user.name || email.split("@")[0];
  let authorId = user.authorId;
  if (!authorId) {
    const [author] = await db
      .insert(schema.authors)
      .values({ slug: await uniqueAuthorSlug(name), name, avatarUrl: profile.image ?? null })
      .returning({ id: schema.authors.id });
    authorId = author.id;
  }

  const [updated] = await db
    .update(schema.users)
    .set({ name, image: profile.image ?? user.image, authorId, lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id))
    .returning();
  return updated;
}
