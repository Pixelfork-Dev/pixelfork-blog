import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { siteConfig } from "@/config/site";
import { countWords, renderMarkdown } from "./markdown";
import { defaultAuthor, getAuthorBySlug, getTagBySlug, tags as allTags } from "./taxonomy";
import type { Post, PostSummary, Tag } from "./types";

/**
 * Content repository backed by Markdown files in /content/posts.
 *
 * All pages talk to the functions exported here — never to the file system.
 * When the admin panel arrives, replace the internals with a DB/CMS query
 * and keep the signatures.
 */

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const WORDS_PER_MINUTE = 220;

interface Frontmatter {
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  author?: string;
  cover: { src: string; alt: string; width: number; height: number };
  featured?: boolean;
  draft?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

interface RawPost {
  summary: PostSummary;
  content: string;
  wordCount: number;
  draft: boolean;
}

function toIsoDate(value: unknown, field: string, file: string) {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid "${field}" date in ${file}`);
  }
  return date.toISOString();
}

const loadAll = cache(async (): Promise<RawPost[]> => {
  const files = (await fs.readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));

  const posts = await Promise.all(
    files.map(async (file) => {
      const source = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = matter(source);
      const fm = data as Frontmatter;
      const slug = file.replace(/\.md$/, "");

      if (!fm.title || !fm.excerpt || !fm.publishedAt || !fm.cover) {
        throw new Error(`Missing required frontmatter (title, excerpt, publishedAt, cover) in ${file}`);
      }

      const tags = (fm.tags ?? []).map((tagSlug) => {
        const tag = getTagBySlug(tagSlug);
        if (!tag) throw new Error(`Unknown tag "${tagSlug}" in ${file}. Add it to src/lib/taxonomy.ts.`);
        return tag;
      });

      const wordCount = countWords(content);
      const publishedAt = toIsoDate(fm.publishedAt, "publishedAt", file);

      return {
        content,
        wordCount,
        draft: Boolean(fm.draft),
        summary: {
          slug,
          title: fm.title,
          excerpt: fm.excerpt,
          publishedAt,
          updatedAt: fm.updatedAt ? toIsoDate(fm.updatedAt, "updatedAt", file) : publishedAt,
          readingTimeMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
          tags,
          author: (fm.author && getAuthorBySlug(fm.author)) || defaultAuthor,
          cover: fm.cover,
          featured: Boolean(fm.featured),
          seoTitle: fm.seoTitle,
          seoDescription: fm.seoDescription,
        },
      };
    }),
  );

  const now = Date.now();
  return posts
    .filter((p) => !p.draft && new Date(p.summary.publishedAt).getTime() <= now)
    .sort((a, b) => b.summary.publishedAt.localeCompare(a.summary.publishedAt));
});

export async function getAllPosts(): Promise<PostSummary[]> {
  return (await loadAll()).map((p) => p.summary);
}

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const raw = (await loadAll()).find((p) => p.summary.slug === slug);
  if (!raw) return null;
  const { html, toc } = await renderMarkdown(raw.content);
  return { ...raw.summary, html, toc, wordCount: raw.wordCount };
});

export async function getPostsByTag(tagSlug: string) {
  return (await getAllPosts()).filter((p) => p.tags.some((t) => t.slug === tagSlug));
}

/** Tags that have at least one published post, in category-bar order. */
export async function getActiveTags(): Promise<Tag[]> {
  const posts = await getAllPosts();
  const used = new Set(posts.flatMap((p) => p.tags.map((t) => t.slug)));
  return allTags.filter((t) => used.has(t.slug));
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

/** Home: page 1 = featured + grid (featuredCount + postsPerPage - featuredCount), then postsPerPage per page. */
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
