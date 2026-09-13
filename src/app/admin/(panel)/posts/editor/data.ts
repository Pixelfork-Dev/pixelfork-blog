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
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    // Imported Markdown posts are converted once; saving stores them as HTML from then on.
    content: row.contentFormat === "markdown" ? await markdownToHtml(row.content) : row.content,
    tagIds: row.postTags.map((pt) => pt.tagId),
    authorId: row.authorId,
    featured: row.featured,
    coverSrc: row.coverSrc ?? "",
    coverAlt: row.coverAlt ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}
