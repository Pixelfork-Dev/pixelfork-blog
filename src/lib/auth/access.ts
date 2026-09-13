import "server-only";

import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { UserRow } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { burnPasswordCheck, hashPassword, passwordProblem, verifyPassword } from "./password";

/**
 * Who may use /admin. Access is invite-only, with email + password accounts:
 *  - an admin invites an email (a user row without a password), and that person registers to set a password, or
 *  - an email listed in ADMIN_EMAILS can register directly (bootstraps the first admins).
 */

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

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

/** Every team member gets a byline (author profile) the first time they use their account. */
async function ensureAuthor(user: UserRow, name: string) {
  if (user.authorId) return user.authorId;
  const [author] = await db
    .insert(schema.authors)
    .values({ slug: await uniqueAuthorSlug(name), name })
    .returning({ id: schema.authors.id });
  return author.id;
}

export type RegisterResult = { ok: true; email: string } | { ok: false; message: string };

/** Sets the password for an invited email (or an ADMIN_EMAILS address). */
export async function registerAccount(input: { name: string; email: string; password: string }): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || email.split("@")[0];
  const problem = passwordProblem(input.password);
  if (problem) return { ok: false, message: problem };

  let user = await findUserByEmail(email);
  if (!user) {
    if (!bootstrapAdmins().includes(email)) {
      return { ok: false, message: "This email hasn’t been invited. Ask an admin to invite you first." };
    }
    [user] = await db.insert(schema.users).values({ email, role: "admin" }).returning();
  }
  if (user.disabledAt) return { ok: false, message: "This account has been deactivated." };
  if (user.passwordHash) return { ok: false, message: "An account with this email already exists. Sign in instead." };

  const authorId = await ensureAuthor(user, name);
  await db
    .update(schema.users)
    .set({
      name,
      authorId,
      passwordHash: await hashPassword(input.password),
      sessionVersion: user.sessionVersion + 1,
      failedLoginCount: 0,
      lockedUntil: null,
    })
    .where(eq(schema.users.id, user.id));
  return { ok: true, email };
}

/**
 * Checks email + password. Returns the user, or null for any failure (unknown email, wrong password,
 * deactivated, or temporarily locked after repeated failures) so the response never reveals which.
 */
export async function verifySignIn(emailInput: string, password: string): Promise<UserRow | null> {
  const user = await findUserByEmail(emailInput);
  if (!user?.passwordHash) {
    await burnPasswordCheck(password);
    return null;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await burnPasswordCheck(password);
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLoginCount + 1;
    await db
      .update(schema.users)
      .set(
        failed >= MAX_FAILED_LOGINS
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLoginCount: failed },
      )
      .where(eq(schema.users.id, user.id));
    return null;
  }
  if (user.disabledAt) return null;

  const [updated] = await db
    .update(schema.users)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), authorId: await ensureAuthor(user, user.name ?? user.email.split("@")[0]) })
    .where(eq(schema.users.id, user.id))
    .returning();
  return updated;
}

/** Change a signed-in user's password; signs out their other sessions. */
export async function changePassword(user: UserRow, current: string, next: string): Promise<string | null> {
  if (!user.passwordHash || !(await verifyPassword(current, user.passwordHash))) return "Your current password is incorrect.";
  const problem = passwordProblem(next);
  if (problem) return problem;
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: user.sessionVersion + 1 })
    .where(eq(schema.users.id, user.id));
  return null;
}
