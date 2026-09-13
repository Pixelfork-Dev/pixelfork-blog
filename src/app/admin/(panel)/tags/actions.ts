"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { recordMove, releasePath } from "@/lib/admin/redirects";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";
import { slugify } from "@/lib/slug";

export interface TagResult {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name" | "slug" | "description", string>>;
}

const tagSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(40, "Keep tag names under 40 characters."),
  slug: z
    .string()
    .trim()
    .max(60, "Keep the slug under 60 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens."),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
});

async function guarded(fn: () => Promise<TagResult>): Promise<TagResult> {
  try {
    await assertRole("editor");
    const result = await fn();
    if (result.ok) revalidatePublicSite();
    return result;
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

function parse(input: { name: string; slug: string; description: string }) {
  const parsed = tagSchema.safeParse({ ...input, slug: input.slug.trim() || slugify(input.name) });
  if (parsed.success) return { data: parsed.data };
  const fieldErrors: TagResult["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as "name" | "slug" | "description";
    fieldErrors[key] ??= issue.message;
  }
  return { error: { ok: false, message: "Please fix the highlighted fields.", fieldErrors } satisfies TagResult };
}

export async function createTag(input: { name: string; slug: string; description: string }): Promise<TagResult> {
  return guarded(async () => {
    const { data, error } = parse(input);
    if (error) return error;
    if (await db.query.tags.findFirst({ where: eq(schema.tags.slug, data.slug) })) {
      return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: { slug: "Another tag already uses this slug." } };
    }
    const last = await db.query.tags.findFirst({ orderBy: (t, { desc }) => [desc(t.sortOrder)] });
    await db.insert(schema.tags).values({ ...data, sortOrder: (last?.sortOrder ?? -1) + 1 });
    await releasePath(`/tag/${data.slug}`);
    return { ok: true, message: `Tag “${data.name}” created.` };
  });
}

export async function updateTag(id: string, input: { name: string; slug: string; description: string }): Promise<TagResult> {
  return guarded(async () => {
    const tagId = z.uuid().parse(id);
    const { data, error } = parse(input);
    if (error) return error;
    const clash = await db.query.tags.findFirst({ where: and(eq(schema.tags.slug, data.slug), ne(schema.tags.id, tagId)) });
    if (clash) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: { slug: "Another tag already uses this slug." } };
    const before = await db.query.tags.findFirst({ columns: { slug: true }, where: eq(schema.tags.id, tagId) });
    await db.update(schema.tags).set(data).where(eq(schema.tags.id, tagId));
    if (before && before.slug !== data.slug) {
      await recordMove(`/tag/${before.slug}`, `/tag/${data.slug}`);
      return { ok: true, message: `Tag saved. /tag/${before.slug} now redirects to /tag/${data.slug}.` };
    }
    return { ok: true, message: "Tag saved." };
  });
}

/** Move a tag one place up or down in the public category bar. */
export async function moveTag(id: string, direction: "up" | "down"): Promise<TagResult> {
  return guarded(async () => {
    const all = await db.select().from(schema.tags).orderBy(asc(schema.tags.sortOrder), asc(schema.tags.name));
    const index = all.findIndex((t) => t.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= all.length) return { ok: false, message: "Can’t move further." };
    const order = [...all];
    [order[index], order[swapWith]] = [order[swapWith], order[index]];
    await db.transaction(async (tx) => {
      for (const [i, tag] of order.entries()) {
        if (tag.sortOrder !== i) await tx.update(schema.tags).set({ sortOrder: i }).where(eq(schema.tags.id, tag.id));
      }
    });
    return { ok: true, message: "Order updated." };
  });
}

export async function deleteTag(id: string): Promise<TagResult> {
  return guarded(async () => {
    const [deleted] = await db.delete(schema.tags).where(eq(schema.tags.id, z.uuid().parse(id))).returning({ name: schema.tags.name });
    return deleted ? { ok: true, message: `Tag “${deleted.name}” deleted.` } : { ok: false, message: "This tag no longer exists." };
  });
}
