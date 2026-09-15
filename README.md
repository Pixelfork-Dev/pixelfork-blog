# Pixelfork Blog

The Pixelfork blog at **https://pixelfork.ai/blog**, built with Next.js 16 (App Router), Postgres (Supabase, Drizzle ORM) and Auth.js (email + password).
It's a separate Vercel project served under the main site: pixelfork.ai rewrites `/blog/*` to it (Next.js multi-zones).
Public pages are prerendered for SEO. Content is managed in an invite-only admin panel at `/admin`.
Design source: Figma **Pixelfork MVP**, frame `2898:21926`.

## Local development

```bash
cp .env.example .env.local   # fill AUTH_SECRET and ADMIN_EMAILS (see below)
npm install
npm run db:local             # terminal 1: local Postgres (PGlite) on port 54329, data in .data/
npm run db:setup             # terminal 2: run migrations and import starter posts (first run only)
npm run dev                  # http://localhost:3000/blog · admin at /blog/admin
```

First run: open `/blog/admin/register` and create an account with an email listed in `ADMIN_EMAILS`.

| Script | What it does |
| --- | --- |
| `npm run db:local` | Local Postgres server (PGlite) |
| `npm run db:setup` | Apply migrations; import `seed/` content into an empty database |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:studio` | Browse the database |
| `npm run build` | `db:setup` + `content:sync` + `next build` (what Vercel runs) |
| `npm run post:publish -- <slug>` | Publish an article package from `content/posts/<slug>` (see `content/posts/types.ts`) |
| `npm run post:preview -- <slug>` | Render an article package's infographics to PNG for checking |
| `npm run post:send -- <slug>` | Send an article package to the live blog as a draft through the Publishing API (token from the Keychain) |
| `npm run post:send -- --cover <slug> <image> "<alt>"` | Replace a live post's cover through the Publishing API |
| `npm run cover -- <slug> "<subject>"` | Generate a cover with Nano Banana 2 (Gemini API key from the Keychain) |
| `npm run content:sync` | Import new article packages as **drafts** (runs on every Vercel build; never overwrites existing posts) |

## Admin & access

- **Invite-only, email + password.** An admin invites an email in *Admin → Users*; that person creates their account
  (name + password) at `/blog/admin/register`. Emails in `ADMIN_EMAILS` can register directly as admins (use this for the first admin).
- Passwords are hashed with scrypt. 5 wrong passwords lock the account for 15 minutes.
- *Account* changes your password; *Users → Reset password* clears someone's password so they can register again.
  Both sign the person out on every device.
- **Roles:**
  - `admin`: everything, including users and API tokens.
  - `editor`: all content: publish, review submissions, tags, media, authors, redirects.
  - `contributor`: writes their own drafts, uploads images, picks existing tags and **submits drafts for review**. Can't publish,
    delete, manage tags/authors/redirects, or see other people's posts. A submitted draft is locked until an editor publishes it or
    sends it back with a note. Editors see submissions under *Dashboard → Waiting for review* and a badge on *Posts*.
    Contributors can also edit their **published** posts: changes are saved as a private revision (the live article doesn't change)
    and submitted for review. Editors see the proposed version and can *Publish changes*, *Send back with note* or *Discard changes*.
- Roles and deactivation apply on the next request, and every page and server action re-checks the user in the database (`src/lib/auth/dal.ts`).
- The blog always keeps at least one active admin. Admins can't demote or deactivate themselves.

## Writing posts

*Admin → Posts → New post.* The editor saves sanitized HTML (scripts, styles, event handlers and unknown embeds are stripped;
YouTube embeds are allowed). Drafts can be previewed at `/admin/preview/<id>`.
Publishing, updating, unpublishing or deleting a live post refreshes the public site immediately (`revalidatePath`), so new posts
appear on the home page, tag pages, sitemap, RSS and their own URL right away. If two people edit the same post, the second save is
rejected instead of overwriting the first.

## SEO tools

- **Editor SEO panel:** focus keyword checks (title, description, URL, intro, headings), title/description length, word count,
  heading structure, cover and image alt text, internal links, plus Google and social share previews.
- **Advanced:** canonical URL for cross-posted articles; *Hide from search* adds `noindex` and removes the post from the sitemap.
- **Scheduling:** *Schedule…* picks a publish time. Public pages regenerate at least every 10 minutes (ISR), so scheduled posts go
  live on time with no cron job.
- **Redirects:** changing the URL of a live post, tag or author creates a permanent (308) redirect automatically, with chains
  flattened to one hop. *Admin → Redirects* lists them with hit counts and accepts manual redirects (for example old blog URLs).
  Redirects are only looked up for URLs that would otherwise 404, so normal page views stay fully static.
- **Dashboard → SEO health:** published posts with fixable issues.

## Publishing API (automation)

*Admin → API tokens* (admins) creates tokens for automation. Only a SHA-256 hash is stored and the token is shown once.
Scopes: `drafts:create` (upload images, create **draft** posts) and `covers:update` (replace a post's cover). Tokens can't publish,
edit text, delete or read users; limits are 5 posts and 60 images per token per 24 hours; revoking takes effect immediately.

| Endpoint | Scope | |
| --- | --- | --- |
| `POST /blog/api/publish/media` | either | multipart `file` (+ `alt`) → `{ url, width, height }` |
| `GET /blog/api/publish/posts/<slug>` | either | `{ exists, status }` |
| `POST /blog/api/publish/posts` | `drafts:create` | JSON `{ slug, title, excerpt, seoTitle, seoDescription, focusKeyword, tags, author?, cover?, html }` → draft |
| `PUT /blog/api/publish/posts/<slug>/cover` | `covers:update` | JSON `{ src, alt }` (an image this token uploaded) |

Send `Authorization: Bearer <token>`. Images referenced in `html` must have been uploaded through the API first.

## Media & tags

- *Admin → Media:* drag-and-drop uploads (JPEG, PNG, WebP, GIF, AVIF; SVG is rejected). Uploads are checked by their actual
  content, auto-rotated, limited to 2400px and converted to WebP. Dimensions are stored so pages don't shift while images load.
  Images still used by a post can't be deleted. Locally, files go to `.data/uploads`; in production they go to Vercel Blob.
- *Admin → Authors:* every byline (team members get one on first sign-in; guest bylines can be added). Name, job title,
  bio, photo, website and profile links feed the public `/authors/<slug>` page, the author box on articles and `Person` JSON-LD
  (`sameAs`) — signals Google uses to judge expertise. Authors without published posts have no public page.
- *Admin → Tags:* create, rename, describe (the description is the tag page's meta description), reorder (the order of the category bar) and delete.

## Deploying (Vercel + Supabase, served at pixelfork.ai/blog)

The app runs with `basePath: "/blog"`, derived from `NEXT_PUBLIC_SITE_URL` (`src/config/site.ts`, `next.config.ts`).
Every page, asset, API route and auth callback lives under `/blog`, so the main site only needs one rewrite.

1. **Supabase:** create a new project → *Connect* → *Connection string* → **Transaction pooler** (port 6543).
   Replace `[YOUR-PASSWORD]` with the database password. That's `DATABASE_URL`.
   Optional: *Project Settings → Database → SSL Configuration → Download certificate* and paste it into `DATABASE_CA_CERT`
   to verify the server certificate (without it the connection is encrypted but not verified).
2. **Vercel project:** in the same team as pixelfork.ai → *Add New → Project* → import `advme/pixelfork-blog` (defaults are fine).
   *Storage → Create → Blob* (Public access) → connect it to the project (adds `BLOB_STORE_ID`, or `BLOB_READ_WRITE_TOKEN` for older stores).
3. **Environment variables** (Vercel → *Settings → Environment Variables*, Production):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://pixelfork.ai/blog` |
   | `AUTH_URL` | `https://pixelfork.ai/blog/api/auth` |
   | `DATABASE_URL` | Supabase transaction pooler URI |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `ADMIN_EMAILS` | First admin's email (registers at /blog/admin/register) |
   | `DATABASE_CA_CERT` | Optional, see step 1 |

4. **Deploy.** The build runs migrations and imports the starter posts once. The app answers at `https://<project>.vercel.app/blog`.
5. **Main site (pixelfork.ai) rewrites** — send `/blog` to this project. In the main site's `next.config`:

   ```js
   async rewrites() {
     return [
       { source: "/blog", destination: "https://<project>.vercel.app/blog" },
       { source: "/blog/:path*", destination: "https://<project>.vercel.app/blog/:path*" },
     ];
   }
   ```

   Or in its `vercel.json`: `{ "rewrites": [{ "source": "/blog/:path*", "destination": "https://<project>.vercel.app/blog/:path*" }] }`
   (plus the same rule for `/blog`). The main site must not have its own `/blog` route, and links to the blog from the main site
   should be plain `<a href="/blog">`, not `next/link`.
   Add `Sitemap: https://pixelfork.ai/blog/sitemap.xml` to the main site's `robots.txt` and submit it in Google Search Console.
   Keep Vercel Deployment Protection off for this project's production deployment, or the rewrite can't reach it.

6. **First admin:** open `https://pixelfork.ai/blog/admin/register` and create the account with the `ADMIN_EMAILS` address.

Canonical URLs always point to pixelfork.ai/blog, so the `*.vercel.app` URL doesn't compete in search.

## Structure

```
src/app/(site)/        Public pages (home, posts, tags) with the blog chrome
src/app/admin/         Admin panel (login, dashboard, posts, users)
src/app/api/auth/      Auth.js route handler
src/auth.ts            Auth.js config (email + password)   · src/auth.config.ts shared with src/proxy.ts
src/db/                Drizzle schema and client               · drizzle/ SQL migrations
src/lib/posts.ts       Public content repository (the only code public pages use to read content)
src/lib/auth/          Access rules and the authorization data access layer
src/lib/seo.ts         Metadata + JSON-LD builders
seed/                  Starter posts and tags imported into an empty database
```

## SEO (built in)

- Prerendered HTML, a single H1 per page, canonical URLs, Open Graph/Twitter cards, and a generated OG image for each post
- JSON-LD: `Organization`, `WebSite`, `Blog`, `BlogPosting`, `BreadcrumbList`, `CollectionPage`
- `sitemap.xml` (with images), `robots.txt` rules for `/blog/admin`, `/blog/api/` (crawlers read the main site's robots.txt — add the sitemap there), RSS feed
- `/admin` is `noindex` via both metadata and the `X-Robots-Tag` header

## Roadmap

1. ✅ Foundation: Postgres, email + password sign-in, roles, starter content imported
2. ✅ Posts: rich-text editor (Tiptap), drafts, preview, publish/unpublish, delete, conflict detection, on-demand revalidation
3. ✅ Media library (uploads resized to WebP, alt text, picker in the editor, in-use protection) and tag management
4. ✅ Author profiles (admin) and public author pages with Person/ProfilePage JSON-LD, bylines and author boxes
5. ✅ SEO panel (checklist, focus keyword, social preview, canonical, noindex), scheduled publishing, redirects, SEO health
