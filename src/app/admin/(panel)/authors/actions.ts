"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";

export interface AuthorInput {
  id?: string;
  name: string;
  slug: string;
  jobTitle: string;
  bio: string;
  avatarUrl: string;
  websiteUrl: string;
  sameAs: string[];
}

export interface AuthorResult {
  ok: boolean;
  message: string;
  id?: string;
  fieldErrors?: Partial<Record<keyof AuthorInput, string>>;
}

const httpsUrl = z.url({ protocol: /^https$/, message: "Use a full https:// URL." });

const authorSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Add a name.").max(80, "Keep the name under 80 characters."),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens."),
  jobTitle: z.string().trim().max(80, "Keep the job title under 80 characters."),
  bio: z.string().trim().max(500, "Keep the bio under 500 characters."),
  avatarUrl: z.union([z.literal(""), z.string().trim().regex(/^\/uploads\//, "Pick an image from the media library."), httpsUrl]),
  websiteUrl: z.union([z.literal(""), httpsUrl]),
  sameAs: z.array(httpsUrl).max(6, "Add at most 6 profile links."),
});

export async function saveAuthor(input: AuthorInput): Promise<AuthorResult> {
  try {
    await assertRole("editor");
    const cleaned = { ...input, sameAs: input.sameAs.map((u) => u.trim()).filter(Boolean) };
    const parsed = authorSchema.safeParse(cleaned);
    if (!parsed.success) {
      const fieldErrors: AuthorResult["fieldErrors"] = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AuthorInput;
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
    }
    const { id, ...data } = parsed.data;

    const clash = await db.query.authors.findFirst({
      columns: { id: true },
      where: id ? and(eq(schema.authors.slug, data.slug), ne(schema.authors.id, id)) : eq(schema.authors.slug, data.slug),
    });
    if (clash) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: { slug: "Another author already uses this URL." } };

    const values = {
      name: data.name,
      slug: data.slug,
      jobTitle: data.jobTitle || null,
      bio: data.bio || null,
      avatarUrl: data.avatarUrl || null,
      websiteUrl: data.websiteUrl || null,
      sameAs: data.sameAs,
    };

    const [row] = id
      ? await db.update(schema.authors).set(values).where(eq(schema.authors.id, id)).returning({ id: schema.authors.id })
      : await db.insert(schema.authors).values(values).returning({ id: schema.authors.id });
    if (!row) return { ok: false, message: "This author no longer exists." };

    revalidatePublicSite();
    return { ok: true, message: id ? "Profile saved." : "Author created.", id: row.id };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong while saving." };
  }
}

/** Only unused bylines can be deleted: no posts and no linked team member. */
export async function deleteAuthor(id: string): Promise<AuthorResult> {
  try {
    await assertRole("editor");
    const authorId = z.uuid().parse(id);
    const [{ value: postCount }] = await db.select({ value: count() }).from(schema.posts).where(eq(schema.posts.authorId, authorId));
    if (postCount > 0) return { ok: false, message: `This author has ${postCount} post${postCount === 1 ? "" : "s"}. Reassign them first.` };
    const linked = await db.query.users.findFirst({ columns: { id: true }, where: eq(schema.users.authorId, authorId) });
    if (linked) return { ok: false, message: "This profile belongs to a team member and can’t be deleted." };
    const [deleted] = await db.delete(schema.authors).where(eq(schema.authors.id, authorId)).returning({ id: schema.authors.id });
    return deleted ? { ok: true, message: "Author deleted." } : { ok: false, message: "This author no longer exists." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong while deleting." };
  }
}
