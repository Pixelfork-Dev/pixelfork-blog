/**
 * Publishes article packages from content/posts/<slug>/post.mts into the database:
 * uploads the cover, rasterizes infographics, uploads real screenshots, renders "attention required"
 * placeholders for missing screenshots, converts the Markdown body to HTML and creates/updates the post.
 *
 *   npm run post:publish -- <slug> [<slug> ...] [--draft] [--replace]
 *   npm run post:publish -- --all [--draft] [--replace]
 *   npm run content:sync        (runs on every Vercel build)
 *
 * Without --replace an existing post with the same slug is skipped. With --replace it is updated in
 * place (same id, same publish date) and its old images are removed.
 *
 * --sync is the deploy mode: every package whose slug isn't in the database yet is imported as a
 * **draft** (an editor reviews and publishes it in /admin). Existing posts are never touched, and a
 * failure is logged without failing the deploy.
 */
import fs from "node:fs/promises";
import path from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {}

const { db, schema } = await import("../src/db/index.ts");
const { processImage, storeImage, removeImage } = await import("../src/lib/media/storage.ts");
const { sanitizePostHtml } = await import("../src/lib/sanitize.ts");
const { countWords } = await import("../src/lib/markdown.ts");
const { renderPackage, loadPackage } = await import("./lib/package.mts");
const { eq, inArray } = await import("drizzle-orm");

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const root = path.join(process.cwd(), "content", "posts");
let slugs = args.filter((a) => !a.startsWith("--"));
const sync = flags.has("--sync");
if (sync) {
  flags.add("--all");
  flags.add("--draft");
  flags.delete("--replace");
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("- content sync skipped: connect a Vercel Blob store so article images can be uploaded");
    process.exit(0);
  }
}
if (flags.has("--all")) {
  slugs = (await fs.readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  const ready = await Promise.all(slugs.map((s) => fs.access(path.join(root, s, "post.mts")).then(() => true, () => false)));
  slugs = slugs.filter((_, i) => ready[i]);
}
if (!slugs.length) {
  console.error("Usage: npm run post:publish -- <slug> [...] | --all  [--draft] [--replace]");
  process.exit(1);
}

async function upload(buffer: Buffer, filename: string, alt: string) {
  const processed = await processImage(buffer);
  const stored = await storeImage(processed.buffer, filename);
  const [row] = await db
    .insert(schema.media)
    .values({ url: stored.url, pathname: stored.pathname, filename, mimeType: processed.mimeType, size: processed.buffer.length, width: processed.width, height: processed.height, alt })
    .returning();
  return { url: row.url, alt, width: row.width!, height: row.height! };
}

async function publish(slug: string, baseTime: Date) {
  const dir = path.join(root, slug);
  const pkg = await loadPackage(slug);

  const existing = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug) });
  if (existing && !flags.has("--replace")) {
    if (!sync) console.log(`- ${slug}: already exists, skipped (use --replace to update)`);
    return;
  }
  const { cover, html, placeholders } = await renderPackage(pkg, dir, upload);
  const content = sanitizePostHtml(html);

  const [author] = await db.select().from(schema.authors).where(eq(schema.authors.slug, pkg.author ?? "pixelfork-team"));
  const tagRows = await db.select().from(schema.tags).where(inArray(schema.tags.slug, pkg.tags));
  const missingTags = pkg.tags.filter((t) => !tagRows.some((r) => r.slug === t));
  if (missingTags.length) throw new Error(`${slug}: unknown tags ${missingTags.join(", ")}`);

  const status = flags.has("--draft") ? "draft" : "published";
  const values = {
    slug,
    title: pkg.title,
    excerpt: pkg.excerpt,
    content,
    contentFormat: "html" as const,
    status: status as "draft" | "published",
    featured: pkg.featured ?? false,
    coverSrc: cover?.url ?? null,
    coverAlt: cover?.alt ?? null,
    coverWidth: cover?.width ?? null,
    coverHeight: cover?.height ?? null,
    seoTitle: pkg.seoTitle,
    seoDescription: pkg.seoDescription,
    focusKeyword: pkg.focusKeyword,
    authorId: author.id,
    updatedAt: new Date(),
  };

  let postId: string;
  if (existing) {
    const oldUrls = [existing.coverSrc, ...[...existing.content.matchAll(/src="([^"]+)"/g)].map((m) => m[1])].filter(Boolean) as string[];
    await db
      .update(schema.posts)
      .set({ ...values, publishedAt: status === "published" ? (existing.publishedAt ?? baseTime) : existing.publishedAt })
      .where(eq(schema.posts.id, existing.id));
    postId = existing.id;
    await db.delete(schema.postTags).where(eq(schema.postTags.postId, postId));
    if (oldUrls.length) {
      for (const row of await db.select().from(schema.media).where(inArray(schema.media.url, oldUrls))) {
        await removeImage(row);
        await db.delete(schema.media).where(eq(schema.media.id, row.id));
      }
    }
  } else {
    const [row] = await db
      .insert(schema.posts)
      .values({ ...values, publishedAt: status === "published" ? baseTime : null, createdAt: baseTime })
      .returning({ id: schema.posts.id });
    postId = row.id;
  }
  await db.insert(schema.postTags).values(pkg.tags.map((s, position) => ({ postId, tagId: tagRows.find((t) => t.slug === s)!.id, position })));

  console.log(
    `✓ ${slug}: ${existing ? "updated" : "created"} (${status}) · ${countWords(content, "html")} words` +
      (placeholders ? ` · ⚠ ${placeholders} screenshot placeholders` : "") +
      (cover ? "" : " · ⚠ no cover"),
  );
}

// Stagger publish times so newly created posts keep a stable order (first slug = newest).
const now = Date.now();
for (const [i, slug] of slugs.entries()) {
  try {
    await publish(slug, new Date(now - i * 60_000));
  } catch (error) {
    if (!sync) throw error;
    console.error(`✗ ${slug}: ${(error as Error).message}`);
  }
}

process.exit(0);
