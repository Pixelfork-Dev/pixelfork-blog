"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { API_SCOPES, generateToken } from "@/lib/api/tokens";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";

export interface CreateTokenState {
  ok: boolean;
  message: string;
  /** The plain token, returned exactly once. */
  token?: string;
}

export async function createToken(_prev: CreateTokenState, formData: FormData): Promise<CreateTokenState> {
  try {
    const me = await assertRole("admin");
    const parsed = z
      .object({
        name: z.string().trim().min(2, "Give the token a name.").max(60),
        scopes: z.array(z.enum(Object.keys(API_SCOPES) as [keyof typeof API_SCOPES])).min(1, "Pick at least one permission."),
      })
      .safeParse({ name: formData.get("name"), scopes: formData.getAll("scopes") });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

    const { token, tokenHash, prefix } = generateToken();
    await db.insert(schema.apiTokens).values({ name: parsed.data.name, tokenHash, prefix, scopes: parsed.data.scopes, createdById: me.id });
    revalidatePath("/admin/api-tokens");
    return { ok: true, message: "Token created. Copy it now — it won’t be shown again.", token };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function revokeToken(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    await assertRole("admin");
    await db
      .update(schema.apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.apiTokens.id, id), isNull(schema.apiTokens.revokedAt)));
    revalidatePath("/admin/api-tokens");
    return { ok: true, message: "Token revoked." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    throw e;
  }
}
