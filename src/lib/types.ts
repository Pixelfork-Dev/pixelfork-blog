/**
 * Domain types. These are the contract between the UI and the content source.
 * Today posts come from Markdown files; when the admin panel lands, a database /
 * CMS repository only has to return these same shapes.
 */

export interface Author {
  slug: string;
  name: string;
  role?: string;
  url?: string;
  avatar?: string;
  bio?: string;
}

export interface Tag {
  slug: string;
  name: string;
  description: string;
}

export interface CoverImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface PostSummary {
  slug: string;
  title: string;
  /** Used for meta description, cards, RSS. Keep it 120–160 characters. */
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  tags: Tag[];
  author: Author;
  cover: CoverImage;
  featured: boolean;
  /** Optional overrides for the <title> and meta description. */
  seoTitle?: string;
  seoDescription?: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface Post extends PostSummary {
  html: string;
  toc: TocItem[];
  wordCount: number;
}
