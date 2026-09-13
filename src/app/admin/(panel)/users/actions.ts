"use server";

import { and, count, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { findUserByEmail, normalizeEmail } from "@/lib/auth/access";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";

export interface ActionState {
  ok: boolean;
  message: string;
}

const roleSchema = z.enum(["admin", "editor"]);

async function guarded(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    const result = await fn();
    revalidatePath("/admin/users");
    return result;
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** Refuse changes that would leave the blog without an active admin. */
async function otherActiveAdmins(exceptUserId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, "admin"), isNull(schema.users.disabledAt), ne(schema.users.id, exceptUserId)));
  return value;
}

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(async () => {
    const me = await assertRole("admin");
    const parsed = z
      .object({ email: z.email("Enter a valid email address."), role: roleSchema })
      .safeParse({ email: String(formData.get("email") ?? "").trim(), role: formData.get("role") });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

    const email = normalizeEmail(parsed.data.email);
    if (await findUserByEmail(email)) return { ok: false, message: `${email} already has access.` };

    await db.insert(schema.users).values({ email, role: parsed.data.role, invitedById: me.id });
    return { ok: true, message: `Invited ${email} as ${parsed.data.role}. They can now sign in with Google.` };
  });
}

export async function changeRole(userId: string, role: string): Promise<ActionState> {
  return guarded(async () => {
    const me = await assertRole("admin");
    const nextRole = roleSchema.parse(role);
    if (userId === me.id) return { ok: false, message: "You can’t change your own role." };
    const target = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!target) return { ok: false, message: "User not found." };
    if (target.role === "admin" && nextRole !== "admin" && (await otherActiveAdmins(userId)) === 0) {
      return { ok: false, message: "The blog needs at least one active admin." };
    }
    await db.update(schema.users).set({ role: nextRole }).where(eq(schema.users.id, userId));
    return { ok: true, message: `Role updated to ${nextRole}.` };
  });
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<ActionState> {
  return guarded(async () => {
    const me = await assertRole("admin");
    if (userId === me.id) return { ok: false, message: "You can’t deactivate yourself." };
    const target = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!target) return { ok: false, message: "User not found." };
    if (disabled && target.role === "admin" && (await otherActiveAdmins(userId)) === 0) {
      return { ok: false, message: "The blog needs at least one active admin." };
    }
    await db
      .update(schema.users)
      .set({ disabledAt: disabled ? new Date() : null })
      .where(eq(schema.users.id, userId));
    return { ok: true, message: disabled ? "Access removed." : "Access restored." };
  });
}

/** Cancel an invitation that was never used. People who have signed in are deactivated instead. */
export async function revokeInvite(userId: string): Promise<ActionState> {
  return guarded(async () => {
    const me = await assertRole("admin");
    if (userId === me.id) return { ok: false, message: "You can’t remove yourself." };
    const deleted = await db
      .delete(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.lastLoginAt)))
      .returning({ id: schema.users.id });
    return deleted.length
      ? { ok: true, message: "Invitation cancelled." }
      : { ok: false, message: "This person has already signed in — deactivate them instead." };
  });
}
