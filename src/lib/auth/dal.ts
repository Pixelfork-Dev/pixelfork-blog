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

/** For pages: only admins; editors are sent back to the dashboard. */
export async function requireAdminPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin");
  return user;
}

export class AuthorizationError extends Error {}

/** For server actions: throw instead of redirecting. */
export async function assertRole(role: UserRole) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("You are signed out.");
  if (role === "admin" && user.role !== "admin") throw new AuthorizationError("Only admins can do that.");
  return user;
}
