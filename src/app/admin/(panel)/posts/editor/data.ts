import "server-only";

import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { markdownToHtml } from "@/lib/markdown";
import type { EditorPost } from "./PostEditor";

export async function loadEditorOptions() {
  const [tags, authors] = await Promise.all([
    db.select({ id: schema.tags.id, name: schema.tags.name }).from(schema.tags).orderBy(asc(schema.tags.sortOrder), asc(schema.tags.name)),
    db.select({ id: schema.authors.id, name: schema.authors.name }).from(schema.authors).orderBy(asc(schema.authors.name)),
  ]);
  return { tags, authors };
}

export async function loadEditorPost(id: string): Promise<EditorPost | null> {
  const row = await db.query.posts.findFirst({
    where: eq(schema.posts.id, id),
    with: { postTags: { orderBy: [asc(schema.postTags.position)] } },
  });
  if (!row) return null;
  // A contributor's proposed changes to a live post are what gets edited and reviewed.
  const rev = row.pendingRevision;
  return {
    id: row.id,
    title: rev?.title ?? row.title,
    slug: row.slug,
    excerpt: rev?.excerpt ?? row.excerpt,
    // Imported Markdown posts are converted once; saving stores them as HTML from then on.
    content: rev ? rev.content : row.contentFormat === "markdown" ? await markdownToHtml(row.content) : row.content,
    tagIds: rev?.tagIds ?? row.postTags.map((pt) => pt.tagId),
    authorId: row.authorId,
    featured: row.featured,
    coverSrc: (rev ? rev.coverSrc : row.coverSrc) ?? "",
    coverAlt: (rev ? rev.coverAlt : row.coverAlt) ?? "",
    coverWidth: rev ? rev.coverWidth : row.coverWidth,
    coverHeight: rev ? rev.coverHeight : row.coverHeight,
    seoTitle: (rev ? rev.seoTitle : row.seoTitle) ?? "",
    seoDescription: (rev ? rev.seoDescription : row.seoDescription) ?? "",
    focusKeyword: (rev ? rev.focusKeyword : row.focusKeyword) ?? "",
    canonicalUrl: (rev ? rev.canonicalUrl : row.canonicalUrl) ?? "",
    noindex: rev ? rev.noindex : row.noindex,
    status: row.status,
    createdById: row.createdById,
    reviewRequestedAt: row.reviewRequestedAt?.toISOString() ?? null,
    reviewNote: row.reviewNote,
    hasPendingRevision: Boolean(rev),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}
