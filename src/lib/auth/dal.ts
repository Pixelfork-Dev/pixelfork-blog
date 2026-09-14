import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import type { UserRole } from "@/db/schema";

/**
 * Data access layer for authorization. Every admin page and server action goes through here,
 * reading the user fresh from the database so role changes and deactivation apply immediately.
 */

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  // A password change or reset bumps session_version, which signs out sessions issued before it.
  return user && !user.disabledAt && user.passwordHash && session.user.sv === user.sessionVersion ? user : null;
});

/** For pages: send signed-out visitors to the login screen. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/**
 * Roles, from least to most access:
 *  - contributor: writes their own drafts and submits them for review; can't publish, delete or manage tags/settings.
 *  - editor: all content (publish, review, tags, media, authors, redirects).
 *  - admin: everything, including users and API tokens.
 */
const RANK: Record<UserRole, number> = { contributor: 1, editor: 2, admin: 3 };

export function hasRole(user: { role: UserRole }, role: UserRole) {
  return RANK[user.role] >= RANK[role];
}

/** For pages: users below `role` are sent back to the dashboard. */
export async function requireRolePage(role: UserRole) {
  const user = await requireUser();
  if (!hasRole(user, role)) redirect("/admin");
  return user;
}

/** For pages: only admins. */
export async function requireAdminPage() {
  return requireRolePage("admin");
}

export class AuthorizationError extends Error {}

/** For server actions: throw instead of redirecting. */
export async function assertRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("You are signed out.");
  if (!hasRole(user, role)) throw new AuthorizationError(role === "admin" ? "Only admins can do that." : "Only editors and admins can do that.");
  return user;
}
