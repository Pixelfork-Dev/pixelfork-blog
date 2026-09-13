"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";
import { isEmptyHtml, sanitizePostHtml } from "@/lib/sanitize";

export type SaveIntent = "save" | "publish" | "unpublish";

export interface PostInput {
  id?: string;
  /** ISO timestamp of the version the editor loaded, to catch concurrent edits. */
  loadedUpdatedAt?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tagIds: string[];
  authorId: string;
  featured: boolean;
  coverSrc: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
}

export interface SaveResult {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof PostInput, string>>;
  post?: { id: string; slug: string; status: "draft" | "scheduled" | "published"; updatedAt: string; publishedAt: string | null };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const baseSchema = z.object({
  id: z.uuid().optional(),
  loadedUpdatedAt: z.string().optional(),
  title: z.string().trim().min(1, "Add a title.").max(200, "Keep the title under 200 characters."),
  slug: z.string().trim().max(100, "Keep the URL slug under 100 characters.").regex(SLUG, "Use lowercase letters, numbers and single hyphens."),
  excerpt: z.string().trim().max(300, "Keep the excerpt under 300 characters."),
  content: z.string(),
  tagIds: z.array(z.uuid()).max(8, "Use at most 8 tags."),
  authorId: z.uuid("Choose an author."),
  featured: z.boolean(),
  coverSrc: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Use an https:// URL or a site path like /images/…"),
  coverAlt: z.string().trim().max(200),
  seoTitle: z.string().trim().max(80, "Search titles get cut off after ~60 characters."),
  seoDescription: z.string().trim().max(200, "Meta descriptions get cut off after ~160 characters."),
});

function fieldErrors(error: z.ZodError): SaveResult["fieldErrors"] {
  const out: SaveResult["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof PostInput;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function savePost(input: PostInput, intent: SaveIntent): Promise<SaveResult> {
  try {
    const user = await assertRole("editor");
    const parsed = baseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const data = parsed.data;
    const content = sanitizePostHtml(data.content);

    const existing = data.id ? await db.query.posts.findFirst({ where: eq(schema.posts.id, data.id) }) : undefined;
    if (data.id && !existing) return { ok: false, message: "This post no longer exists." };

    if (existing && data.loadedUpdatedAt && existing.updatedAt.getTime() > new Date(data.loadedUpdatedAt).getTime() + 1) {
      return {
        ok: false,
        message: "Someone else saved this post after you opened it. Copy your changes, reload the page and try again.",
      };
    }

    const wasLive = existing?.status === "published" || existing?.status === "scheduled";
    const nextStatus =
      intent === "publish" ? "published" : intent === "unpublish" ? "draft" : (existing?.status ?? "draft");
    const willBeLive = nextStatus !== "draft";

    const errors: SaveResult["fieldErrors"] = {};
    if (coverAltMissing(data)) errors.coverAlt = "Describe the cover image for accessibility and image search.";
    if (willBeLive) {
      if (data.excerpt.length < 40) errors.excerpt = "Published posts need an excerpt of at least 40 characters (used for SEO).";
      if (isEmptyHtml(content)) errors.content = "Published posts need some content.";
    }

    const slugTaken = await db.query.posts.findFirst({
      columns: { id: true },
      where: data.id ? and(eq(schema.posts.slug, data.slug), ne(schema.posts.id, data.id)) : eq(schema.posts.slug, data.slug),
    });
    if (slugTaken) errors.slug = "Another post already uses this URL.";

    const author = await db.query.authors.findFirst({ columns: { id: true }, where: eq(schema.authors.id, data.authorId) });
    if (!author) errors.authorId = "Choose an author.";

    if (data.tagIds.length) {
      const found = await db.select({ id: schema.tags.id }).from(schema.tags).where(inArray(schema.tags.id, data.tagIds));
      if (found.length !== new Set(data.tagIds).size) errors.tagIds = "Some tags no longer exist.";
    }

    if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: errors };

    const values = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content,
      contentFormat: "html" as const,
      status: nextStatus,
      featured: data.featured,
      coverSrc: data.coverSrc || null,
      coverAlt: data.coverSrc ? data.coverAlt : null,
      coverWidth: data.coverSrc && data.coverSrc === existing?.coverSrc ? existing.coverWidth : null,
      coverHeight: data.coverSrc && data.coverSrc === existing?.coverSrc ? existing.coverHeight : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      authorId: data.authorId,
      updatedById: user.id,
      publishedAt: intent === "publish" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
    };

    const saved = await db.transaction(async (tx) => {
      const [row] = existing
        ? await tx.update(schema.posts).set(values).where(eq(schema.posts.id, existing.id)).returning()
        : await tx.insert(schema.posts).values({ ...values, createdById: user.id }).returning();

      await tx.delete(schema.postTags).where(eq(schema.postTags.postId, row.id));
      const uniqueTags = [...new Set(data.tagIds)];
      if (uniqueTags.length) {
        await tx.insert(schema.postTags).values(uniqueTags.map((tagId, position) => ({ postId: row.id, tagId, position })));
      }
      return row;
    });

    if (wasLive || willBeLive) revalidatePublicSite();

    const message =
      intent === "publish"
        ? wasLive
          ? "Changes published."
          : "Post published — it’s live now."
        : intent === "unpublish"
          ? "Post unpublished and moved back to drafts."
          : willBeLive
            ? "Changes published."
            : "Draft saved.";

    return {
      ok: true,
      message,
      post: {
        id: saved.id,
        slug: saved.slug,
        status: saved.status,
        updatedAt: saved.updatedAt.toISOString(),
        publishedAt: saved.publishedAt?.toISOString() ?? null,
      },
    };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong while saving. Please try again." };
  }
}

function coverAltMissing(data: { coverSrc: string; coverAlt: string }) {
  return data.coverSrc !== "" && data.coverAlt === "";
}

export async function deletePost(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    await assertRole("editor");
    const [deleted] = await db
      .delete(schema.posts)
      .where(eq(schema.posts.id, z.uuid().parse(id)))
      .returning({ status: schema.posts.status });
    if (!deleted) return { ok: false, message: "This post no longer exists." };
    if (deleted.status !== "draft") revalidatePublicSite();
    return { ok: true, message: "Post deleted." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong while deleting." };
  }
}
