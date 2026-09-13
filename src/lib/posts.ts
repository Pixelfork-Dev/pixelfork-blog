import "server-only";

import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { cache } from "react";
import { siteConfig } from "@/config/site";
import { db, schema } from "@/db";
import { countWords, renderMarkdown } from "./markdown";
import type { Author, Post, PostSummary, Tag } from "./types";

/**
 * Public content repository backed by Postgres.
 *
 * Every public page talks to the functions exported here and receives plain domain objects
 * (see ./types) — never database rows. The admin panel writes to the same tables.
 */

const WORDS_PER_MINUTE = 220;
const FALLBACK_COVER = { src: "/images/posts/unity-beginners-guide.png", alt: "Pixelfork Blog", width: 1024, height: 1024 };

type AuthorRow = typeof schema.authors.$inferSelect;
type TagRow = typeof schema.tags.$inferSelect;

function toAuthor(row: AuthorRow): Author {
  return {
    slug: row.slug,
    name: row.name,
    role: row.jobTitle ?? undefined,
    url: row.websiteUrl ?? undefined,
    avatar: row.avatarUrl ?? undefined,
    bio: row.bio ?? undefined,
  };
}

function toTag(row: TagRow): Tag {
  return { slug: row.slug, name: row.name, description: row.description };
}

/** A post is live when it's published — or scheduled and its time has come. */
const isLive = () =>
  and(
    inArray(schema.posts.status, ["published", "scheduled"]),
    isNotNull(schema.posts.publishedAt),
    lte(schema.posts.publishedAt, new Date()),
  );

const loadLivePosts = cache(async () => {
  const rows = await db.query.posts.findMany({
    where: isLive(),
    orderBy: (p, { desc }) => [desc(p.publishedAt)],
    with: {
      author: true,
      postTags: { with: { tag: true }, orderBy: (pt) => [asc(pt.position)] },
    },
  });

  return rows.map((row) => {
    const wordCount = countWords(row.content);
    const summary: PostSummary = {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      publishedAt: row.publishedAt!.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      readingTimeMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
      tags: row.postTags.map((pt) => toTag(pt.tag)),
      author: toAuthor(row.author),
      cover: row.coverSrc
        ? {
            src: row.coverSrc,
            alt: row.coverAlt ?? row.title,
            width: row.coverWidth ?? FALLBACK_COVER.width,
            height: row.coverHeight ?? FALLBACK_COVER.height,
          }
        : FALLBACK_COVER,
      featured: row.featured,
      seoTitle: row.seoTitle ?? undefined,
      seoDescription: row.seoDescription ?? undefined,
    };
    return { summary, content: row.content, format: row.contentFormat, wordCount };
  });
});

export async function getAllPosts(): Promise<PostSummary[]> {
  return (await loadLivePosts()).map((p) => p.summary);
}

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const raw = (await loadLivePosts()).find((p) => p.summary.slug === slug);
  if (!raw) return null;
  // Phase 2 adds the rich-text editor (format "html"); imported posts are Markdown.
  const { html, toc } = raw.format === "markdown" ? await renderMarkdown(raw.content) : { html: raw.content, toc: [] };
  return { ...raw.summary, html, toc, wordCount: raw.wordCount };
});

export async function getPostsByTag(tagSlug: string) {
  return (await getAllPosts()).filter((p) => p.tags.some((t) => t.slug === tagSlug));
}

export const getTagBySlug = cache(async (slug: string): Promise<Tag | null> => {
  const row = await db.query.tags.findFirst({ where: eq(schema.tags.slug, slug) });
  return row ? toTag(row) : null;
});

/** Tags that have at least one live post, in category-bar order. */
export async function getActiveTags(): Promise<Tag[]> {
  const used = new Set((await getAllPosts()).flatMap((p) => p.tags.map((t) => t.slug)));
  const rows = await db.query.tags.findMany({ orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)] });
  return rows.filter((t) => used.has(t.slug)).map(toTag);
}

/** Posts sharing the most tags with the given post, newest first. */
export async function getRelatedPosts(post: PostSummary, limit = 3) {
  const tagSlugs = new Set(post.tags.map((t) => t.slug));
  return (await getAllPosts())
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ post: p, score: p.tags.filter((t) => tagSlugs.has(t.slug)).length }))
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, limit)
    .map(({ post }) => post);
}

/* ---------------------------------- Pagination ---------------------------------- */

/** Home: page 1 = featured + grid (postsPerPage in total), then postsPerPage per page. */
export function paginateHome(posts: PostSummary[], page: number) {
  const { postsPerPage, featuredCount } = siteConfig;
  const firstPageSize = postsPerPage;
  const totalPages = Math.max(1, 1 + Math.ceil(Math.max(0, posts.length - firstPageSize) / postsPerPage));

  if (page === 1) {
    const ordered = orderFeaturedFirst(posts.slice(0, firstPageSize), featuredCount);
    return {
      featured: ordered.slice(0, featuredCount),
      grid: ordered.slice(featuredCount),
      totalPages,
    };
  }
  const start = firstPageSize + (page - 2) * postsPerPage;
  return { featured: [], grid: posts.slice(start, start + postsPerPage), totalPages };
}

function orderFeaturedFirst(posts: PostSummary[], count: number) {
  const featured = posts.filter((p) => p.featured).slice(0, count);
  return [...featured, ...posts.filter((p) => !featured.includes(p))];
}

export function paginate<T>(items: T[], page: number, perPage = siteConfig.postsPerPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  return { items: items.slice((page - 1) * perPage, page * perPage), totalPages };
}

/** Parses a /page/[page] segment. Page 1 lives at the un-paginated URL, so it's rejected here. */
export function parsePageParam(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  return page >= 2 ? page : null;
}
