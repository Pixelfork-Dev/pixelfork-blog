"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { recordMove, releasePath } from "@/lib/admin/redirects";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { assertRole, AuthorizationError, hasRole } from "@/lib/auth/dal";
import { isEmptyHtml, sanitizePostHtml } from "@/lib/sanitize";

/** "submit" is the contributor's way to hand a draft to an editor; the others need editor rights. */
export type SaveIntent = "save" | "submit" | "publish" | "schedule" | "unpublish";

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
  /** Known when the cover was picked from the media library. */
  coverWidth?: number | null;
  coverHeight?: number | null;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  noindex: boolean;
  /** ISO date-time for intent "schedule". */
  publishAt?: string | null;
}

export interface SaveResult {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof PostInput, string>>;
  post?: {
    id: string;
    slug: string;
    status: "draft" | "scheduled" | "published";
    updatedAt: string;
    publishedAt: string | null;
    reviewRequestedAt: string | null;
    reviewNote: string | null;
  };
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
  coverWidth: z.number().int().positive().max(20000).nullish(),
  coverHeight: z.number().int().positive().max(20000).nullish(),
  seoTitle: z.string().trim().max(80, "Search titles get cut off after ~60 characters."),
  seoDescription: z.string().trim().max(200, "Meta descriptions get cut off after ~160 characters."),
  focusKeyword: z.string().trim().max(60, "Keep the focus keyword short (a phrase people search for)."),
  canonicalUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Use the full https:// URL of the original article." })]),
  noindex: z.boolean(),
  publishAt: z.string().nullish(),
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
    const user = await assertRole("contributor");
    const isReviewer = hasRole(user, "editor");
    if (!isReviewer && intent !== "save" && intent !== "submit") {
      return { ok: false, message: "Contributors can save drafts and submit them for review. An editor publishes them." };
    }
    if (isReviewer && intent === "submit") return { ok: false, message: "Editors can publish directly." };
    const parsed = baseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const data = parsed.data;
    const content = sanitizePostHtml(data.content);

    const existing = data.id ? await db.query.posts.findFirst({ where: eq(schema.posts.id, data.id) }) : undefined;
    if (data.id && !existing) return { ok: false, message: "This post no longer exists." };

    if (!isReviewer) {
      if (existing && existing.createdById !== user.id) return { ok: false, message: "You can only edit your own posts." };
      if (existing && existing.status !== "draft") return { ok: false, message: "This post is live. Ask an editor to change it." };
      if (existing?.reviewRequestedAt) {
        return { ok: false, message: "This post is waiting for review. You can edit it again if an editor sends it back." };
      }
      if (!user.authorId) return { ok: false, message: "Your account has no author profile yet. Ask an admin." };
      // Contributors always write under their own byline and can't feature posts.
      data.authorId = user.authorId;
      data.featured = false;
    }

    if (existing && data.loadedUpdatedAt && existing.updatedAt.getTime() > new Date(data.loadedUpdatedAt).getTime() + 1) {
      return {
        ok: false,
        message: "Someone else saved this post after you opened it. Copy your changes, reload the page and try again.",
      };
    }

    const now = new Date();
    const wasLive = Boolean(existing && existing.status !== "draft" && existing.publishedAt && existing.publishedAt <= now);
    const nextStatus =
      intent === "publish"
        ? "published"
        : intent === "schedule"
          ? "scheduled"
          : intent === "unpublish"
            ? "draft"
            : (existing?.status ?? "draft");

    const errors: SaveResult["fieldErrors"] = {};

    let publishedAt = existing?.publishedAt ?? null;
    if (intent === "publish" && (!publishedAt || publishedAt > now)) publishedAt = now;
    if (intent === "schedule") {
      const when = data.publishAt ? new Date(data.publishAt) : null;
      if (!when || Number.isNaN(when.getTime())) errors.publishAt = "Pick a date and time.";
      else if (when.getTime() < now.getTime() + 60_000) errors.publishAt = "Pick a time in the future (or publish now).";
      else publishedAt = when;
    }
    const willBeLive = nextStatus !== "draft" && Boolean(publishedAt && publishedAt <= now);
    const willBePublic = nextStatus !== "draft"; // live now or scheduled
    if (coverAltMissing(data)) errors.coverAlt = "Describe the cover image for accessibility and image search.";
    if (willBePublic || intent === "submit") {
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
      coverWidth: data.coverSrc ? (data.coverWidth ?? (data.coverSrc === existing?.coverSrc ? existing.coverWidth : null)) : null,
      coverHeight: data.coverSrc ? (data.coverHeight ?? (data.coverSrc === existing?.coverSrc ? existing.coverHeight : null)) : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      focusKeyword: data.focusKeyword || null,
      canonicalUrl: data.canonicalUrl || null,
      noindex: data.noindex,
      authorId: data.authorId,
      updatedById: user.id,
      publishedAt,
      // Submitting starts a review; publishing or scheduling ends it.
      ...(intent === "submit" ? { reviewRequestedAt: now, reviewNote: null } : {}),
      ...(willBePublic ? { reviewRequestedAt: null, reviewNote: null } : {}),
    };

    const saved = await db.transaction(async (tx) => {
      const [row] = existing
        ? await tx.update(schema.posts).set(values).where(eq(schema.posts.id, existing.id)).returning()
        : await tx.insert(schema.posts).values({ ...values, createdById: user.id }).returning();

      // Keep old links working when a live post's URL changes.
      if (wasLive && existing && existing.slug !== row.slug) await recordMove(`/posts/${existing.slug}`, `/posts/${row.slug}`, tx);
      if (willBePublic) await releasePath(`/posts/${row.slug}`, tx);

      await tx.delete(schema.postTags).where(eq(schema.postTags.postId, row.id));
      const uniqueTags = [...new Set(data.tagIds)];
      if (uniqueTags.length) {
        await tx.insert(schema.postTags).values(uniqueTags.map((tagId, position) => ({ postId: row.id, tagId, position })));
      }
      return row;
    });

    if (wasLive || willBeLive) revalidatePublicSite();

    const slugMoved = wasLive && existing && existing.slug !== saved.slug;
    const message =
      intent === "submit"
        ? "Submitted for review. An editor will publish it or send it back with notes."
        : intent === "schedule"
        ? `Scheduled for ${publishedAt!.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC.`
        : intent === "publish"
          ? wasLive
            ? "Changes published."
            : "Post published — it’s live now."
          : intent === "unpublish"
            ? "Post unpublished and moved back to drafts."
            : willBeLive
              ? slugMoved
                ? `Changes published. The old URL now redirects to /posts/${saved.slug}.`
                : "Changes published."
              : nextStatus === "scheduled"
                ? "Scheduled post saved."
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
        reviewRequestedAt: saved.reviewRequestedAt?.toISOString() ?? null,
        reviewNote: saved.reviewNote,
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

/** Editors send a submitted draft back to its contributor with a note. */
export async function returnForChanges(id: string, note: string): Promise<{ ok: boolean; message: string; updatedAt?: string }> {
  try {
    await assertRole("editor");
    const clean = z.string().trim().min(3, "Add a short note so the author knows what to change.").max(1000).safeParse(note);
    if (!clean.success) return { ok: false, message: clean.error.issues[0].message };
    const [row] = await db
      .update(schema.posts)
      .set({ reviewRequestedAt: null, reviewNote: clean.data })
      .where(and(eq(schema.posts.id, z.uuid().parse(id)), eq(schema.posts.status, "draft")))
      .returning({ updatedAt: schema.posts.updatedAt });
    return row
      ? { ok: true, message: "Sent back to the author with your note.", updatedAt: row.updatedAt.toISOString() }
      : { ok: false, message: "Only drafts can be sent back." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong." };
  }
}
