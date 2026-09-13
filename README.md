# Pixelfork Blog

The Pixelfork blog at **https://blog.pixelfork.ai**, built with Next.js 16 (App Router), Postgres (Drizzle ORM) and Auth.js.
Public pages are prerendered for SEO. Content is managed in an invite-only admin panel at `/admin`.
Design source: Figma **Pixelfork MVP**, frame `2898:21926`.

## Local development

```bash
cp .env.example .env.local   # fill AUTH_SECRET and ADMIN_EMAILS (see below)
npm install
npm run db:local             # terminal 1: local Postgres (PGlite) on port 54329, data in .data/
npm run db:setup             # terminal 2: run migrations and import starter posts (first run only)
npm run dev                  # http://localhost:3000 · admin at /admin
```

Without Google credentials, set `AUTH_DEV_LOGIN=true` in `.env.local` to sign in at `/admin/login` with any invited email
(or an email in `ADMIN_EMAILS`). The dev login only works in `next dev` and cannot be enabled in a production build.

| Script | What it does |
| --- | --- |
| `npm run db:local` | Local Postgres server (PGlite) |
| `npm run db:setup` | Apply migrations; import `seed/` content into an empty database |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:studio` | Browse the database |
| `npm run build` | `db:setup` + `next build` (what Vercel runs) |

## Admin & access

- **Invite-only.** A Google account can sign in only if its email was invited in *Admin → Users*,
  or is listed in `ADMIN_EMAILS` (becomes an admin on first sign-in — use this for the first admin).
- **Roles:** `admin` (everything, including users) and `editor` (content).
- Roles and deactivation apply on the next request, and every page and server action re-checks the user in the database (`src/lib/auth/dal.ts`).
- The blog always keeps at least one active admin. Admins can't demote or deactivate themselves.

## Writing posts

*Admin → Posts → New post.* The editor saves sanitized HTML (scripts, styles, event handlers and unknown embeds are stripped;
YouTube embeds are allowed). Drafts can be previewed at `/admin/preview/<id>`.
Publishing, updating, unpublishing or deleting a live post refreshes the public site immediately (`revalidatePath`), so new posts
appear on the home page, tag pages, sitemap, RSS and their own URL right away. If two people edit the same post, the second save is
rejected instead of overwriting the first.

## Deploying to Vercel

1. **Import the repo:** vercel.com → *Add New → Project* → import `advme/pixelfork-blog` (the default Next.js settings are fine).
2. **Database:** in the project, *Storage → Create Database → Neon (Postgres)* → connect it to all environments.
   This adds `DATABASE_URL`.
3. **Google OAuth client:** Google Cloud Console → *APIs & Services → Credentials → Create credentials → OAuth client ID*
   (*Web application*; set up the consent screen first if prompted).
   - Authorized JavaScript origins: `https://blog.pixelfork.ai`, `http://localhost:3000`
   - Authorized redirect URIs:
     `https://blog.pixelfork.ai/api/auth/callback/google`,
     `https://<your-project>.vercel.app/api/auth/callback/google`,
     `http://localhost:3000/api/auth/callback/google`
4. **Environment variables** (Vercel → *Settings → Environment Variables*):
   `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL=https://blog.pixelfork.ai`
5. **Deploy.** The build runs migrations and imports the starter posts once.
6. **Domain:** *Settings → Domains* → add `blog.pixelfork.ai`, then create the CNAME record Vercel shows at your DNS provider.

Google only accepts exact redirect URLs, so sign-in works on the production domain, the main `*.vercel.app` URL and localhost.
It doesn't work on per-branch preview URLs. Preview deployments are kept out of search engines automatically.

## Structure

```
src/app/(site)/        Public pages (home, posts, tags) with the blog chrome
src/app/admin/         Admin panel (login, dashboard, posts, users)
src/app/api/auth/      Auth.js route handler
src/auth.ts            Auth.js config (Google + dev login)   · src/auth.config.ts shared with src/proxy.ts
src/db/                Drizzle schema and client               · drizzle/ SQL migrations
src/lib/posts.ts       Public content repository (the only code public pages use to read content)
src/lib/auth/          Access rules and the authorization data access layer
src/lib/seo.ts         Metadata + JSON-LD builders
seed/                  Starter posts and tags imported into an empty database
```

## SEO (built in)

- Prerendered HTML, a single H1 per page, canonical URLs, Open Graph/Twitter cards, and a generated OG image for each post
- JSON-LD: `Organization`, `WebSite`, `Blog`, `BlogPosting`, `BreadcrumbList`, `CollectionPage`
- `sitemap.xml` (with images), `robots.txt` (blocks `/admin`, `/api/` and non-production deployments), RSS feed
- `/admin` is `noindex` via both metadata and the `X-Robots-Tag` header

## Roadmap

1. ✅ Foundation: Postgres, Google sign-in, roles, starter content imported
2. ✅ Posts: rich-text editor (Tiptap), drafts, preview, publish/unpublish, delete, conflict detection, on-demand revalidation
3. Media library and tag management
4. User profiles and public author pages
5. SEO panel, scheduled publishing, redirects
