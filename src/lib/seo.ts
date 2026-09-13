import type { Metadata } from "next";
import { absoluteUrl, siteConfig, socialLinks } from "@/config/site";
import type { Author, Post, PostSummary, Tag } from "./types";

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

/**
 * Next.js replaces (not merges) `alternates` from the root layout when a page sets it,
 * so every page re-declares the RSS feed alongside its canonical URL.
 */
function alternates(url: string): Metadata["alternates"] {
  return {
    canonical: url,
    types: {
      "application/rss+xml": [{ url: absoluteUrl("/feed.xml"), title: `${siteConfig.name} RSS` }],
    },
  };
}

interface PageMetaInput {
  title?: string;
  description?: string;
  path: string;
  /** Pages that shouldn't appear in search results (e.g. search, drafts). */
  noindex?: boolean;
}

/** Base metadata for listing-type pages (home, tags, pagination). */
export function buildPageMetadata({ title, description, path, noindex }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const desc = description ?? siteConfig.description;
  return {
    title: title ?? { absolute: siteConfig.title },
    description: desc,
    alternates: alternates(url),
    openGraph: {
      type: "website",
      url,
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.title,
      description: desc,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.title,
      description: desc,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function buildPostMetadata(post: Post): Metadata {
  const url = absoluteUrl(`/posts/${post.slug}`);
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title,
    description,
    authors: [{ name: post.author.name, url: post.author.url }],
    keywords: post.tags.map((t) => t.name),
    alternates: alternates(url),
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.url ?? post.author.name],
      section: post.tags[0]?.name,
      tags: post.tags.map((t) => t.name),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD (schema.org)                                                */
/* ------------------------------------------------------------------ */

const ORG_ID = `${siteConfig.mainSiteUrl}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const BLOG_ID = `${siteConfig.url}/#blog`;

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.shortName,
    url: siteConfig.mainSiteUrl,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/apple-icon.png"),
      width: 150,
      height: 150,
    },
    sameAs: socialLinks.map((s) => s.href),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: siteConfig.language,
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/** schema.org Person for a byline, pointing at the author's page on the blog. */
export function personJsonLd(author: Author) {
  return {
    "@type": "Person",
    "@id": `${absoluteUrl(`/authors/${author.slug}`)}#person`,
    name: author.name,
    url: absoluteUrl(`/authors/${author.slug}`),
    ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.avatar ? { image: author.avatar.startsWith("/") ? absoluteUrl(author.avatar) : author.avatar } : {}),
    ...(author.url || author.sameAs.length ? { sameAs: [author.url, ...author.sameAs].filter(Boolean) } : {}),
  };
}

export function authorJsonLd(author: Author, posts: PostSummary[], path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(path),
    name: `${author.name} — ${siteConfig.name}`,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      ...personJsonLd(author),
      ...(posts.length ? { mainEntityOfPage: absoluteUrl(path) } : {}),
    },
    hasPart: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: absoluteUrl(`/posts/${p.slug}`), datePublished: p.publishedAt })),
  };
}

function postListItem(post: PostSummary) {
  return {
    "@type": "BlogPosting",
    "@id": `${absoluteUrl(`/posts/${post.slug}`)}#article`,
    headline: post.title,
    url: absoluteUrl(`/posts/${post.slug}`),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: absoluteUrl(post.cover.src),
    author: { "@type": "Person", name: post.author.name, url: absoluteUrl(`/authors/${post.author.slug}`) },
  };
}

export function blogJsonLd(posts: PostSummary[], path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": BLOG_ID,
    url: absoluteUrl(path),
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    blogPost: posts.map(postListItem),
  };
}

export function tagJsonLd(tag: Tag, posts: PostSummary[], path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: absoluteUrl(path),
    name: `${tag.name} articles`,
    description: tag.description,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/posts/${p.slug}`),
        name: p.title,
      })),
    },
  };
}

export function postJsonLd(post: Post) {
  const url = absoluteUrl(`/posts/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: post.title,
    description: post.excerpt,
    // The generated social card is linked via og:image metadata (its URL carries a build hash).
    image: {
      "@type": "ImageObject",
      url: absoluteUrl(post.cover.src),
      width: post.cover.width,
      height: post.cover.height,
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingTimeMinutes}M`,
    inLanguage: siteConfig.language,
    keywords: post.tags.map((t) => t.name).join(", "),
    articleSection: post.tags[0]?.name,
    author: personJsonLd(post.author),
    publisher: organizationJsonLd(),
    isPartOf: { "@id": BLOG_ID },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
