# Pixelfork Blog

The Pixelfork blog, built with Next.js 16 (App Router). Every page is generated as static HTML at build time.
Design source: Figma **Pixelfork MVP**, frame `2898:21926`.

## Getting started

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_SITE_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

## Writing a post

Add a Markdown file to `content/posts/`. The file name becomes the URL slug (`/posts/<slug>`).

```md
---
title: "Post title"
excerpt: "120–160 character summary, used for the meta description, cards and RSS."
publishedAt: 2026-09-12
updatedAt: 2026-09-20        # optional, used for dateModified
tags: [tutorial, insights]   # slugs from src/lib/taxonomy.ts
author: pixelfork-team
featured: true               # optional, pins the post to the featured area
draft: false                 # optional
seoTitle: "..."              # optional <title> override
seoDescription: "..."        # optional meta description override
cover:
  src: /images/posts/my-cover.png
  alt: "Describe the image"
  width: 1200
  height: 630
---

Markdown body (GitHub-flavored: tables, code blocks…)
```

Drafts and posts with a future `publishedAt` date are left out of the build.

## Structure

```
content/posts/          Markdown articles
src/config/site.ts      Site URL, navigation, social links, pagination sizes
src/lib/posts.ts        Content repository (the only code that reads content)
src/lib/taxonomy.ts     Tags and authors
src/lib/seo.ts          Metadata + JSON-LD builders
src/components/         UI (header, cards, grid, tag bar, pagination…)
src/app/                Routes, sitemap, robots, RSS, OG images
```

### Routes

| Route | Purpose |
| --- | --- |
| `/`, `/page/[n]` | Blog index (featured posts, category bar, grid) |
| `/posts/[slug]` | Article |
| `/tag/[slug]`, `/tag/[slug]/page/[n]` | Tag archive |
| `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/manifest.webmanifest` | Crawlers, feed readers and PWA manifest |
| `/opengraph-image`, `/posts/[slug]/opengraph-image` | Generated 1200×630 social cards |

## SEO checklist (built in)

- Static HTML for every page, with the correct heading order (one H1 per page)
- Canonical URLs, Open Graph and Twitter cards, article published/modified times, and a generated OG image for each post
- JSON-LD: `Organization` + `WebSite` (every page), `Blog`, `BlogPosting`, `BreadcrumbList` and `CollectionPage`
- `sitemap.xml` with image entries and `lastmod`; `robots.txt` blocks non-production deployments
- RSS 2.0 feed, linked from every page
- `next/image` (AVIF/WebP, responsive `sizes`), a priority LCP image, and self-hosted Inter font via `next/font`
- Security headers, `poweredByHeader` off, a skip link, accessible navigation and pagination

## Roadmap hooks

- **Admin panel / CMS:** swap the internals of `src/lib/posts.ts` for a database or CMS query and keep the
  function signatures. `robots.txt` already blocks `/admin` and `/api/`.
- **Scheduled publishing:** add ISR/on-demand revalidation when posts come from a database.
- **Search, newsletter, comments, author pages:** types in `src/lib/types.ts` are ready to extend.

## GitHub Pages preview

Every push to `main` runs `.github/workflows/deploy-pages.yml`. It builds a static export (`GITHUB_PAGES=true`)
served under `/<repo-name>`, with `noindex` switched on so the preview never competes with the real domain in search.
To test the same build locally:

```bash
GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/pixelfork-blog NEXT_PUBLIC_NOINDEX=true npm run build   # outputs ./out
```

GitHub Pages can't run server features, so this mode turns off image optimization and security headers.
Use Vercel or a Node host for production.
