/**
 * Runs migrations, then imports the starter content if the database is empty.
 * Safe to run on every deploy: migrations are idempotent and the import only happens once.
 *
 *   npm run db:setup
 */
import fs from "node:fs/promises";
import path from "node:path";
import { count } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import matter from "gray-matter";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Log where we connect (never the credentials) so a wrong connection string is easy to spot in build logs.
try {
  const target = new URL(process.env.DATABASE_URL ?? "");
  console.log(`→ database: ${target.hostname}:${target.port || "5432"} (user ${decodeURIComponent(target.username).replace(/\..*/, ".***")})`);
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(target.hostname) && process.env.VERCEL) {
    console.error(
      "✗ DATABASE_URL is Supabase's direct connection (IPv6 only), which Vercel can't reach.\n" +
        "  Use Supabase → Connect → Transaction pooler (host *.pooler.supabase.com, port 6543).",
    );
    process.exit(1);
  }
} catch {
  console.error("✗ DATABASE_URL is missing or not a valid URL (special characters in the password must be URL-encoded).");
  process.exit(1);
}

const { db, schema } = await import("../src/db/index.ts");
const { seedAuthor, seedTags } = await import("../seed/taxonomy.ts");

try {
  await db.execute("select 1");
  console.log("✓ connected");
} catch (error) {
  const cause = (error as { cause?: Error }).cause ?? (error as Error);
  console.error(`✗ Can't connect to the database: ${cause.message}`);
  console.error("  Check DATABASE_URL (Supabase → Connect → Transaction pooler) and that the password is correct.");
  process.exit(1);
}

await migrate(db, { migrationsFolder: "drizzle" });
console.log("✓ migrations applied");

const [{ value: postCount }] = await db.select({ value: count() }).from(schema.posts);
const [{ value: tagCount }] = await db.select({ value: count() }).from(schema.tags);

if (postCount > 0 || tagCount > 0) {
  console.log(`✓ content already present (${postCount} posts, ${tagCount} tags) — skipping import`);
} else {
  await db.transaction(async (tx) => {
    const insertedTags = await tx
      .insert(schema.tags)
      .values(seedTags.map((t, i) => ({ ...t, sortOrder: i })))
      .returning({ id: schema.tags.id, slug: schema.tags.slug });
    const tagIds = new Map(insertedTags.map((t) => [t.slug, t.id]));

    const [author] = await tx.insert(schema.authors).values(seedAuthor).returning({ id: schema.authors.id });

    const dir = path.join(process.cwd(), "seed", "posts");
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const { data, content } = matter(await fs.readFile(path.join(dir, file), "utf8"));
      const publishedAt = new Date(data.publishedAt);
      const [post] = await tx
        .insert(schema.posts)
        .values({
          slug: file.replace(/\.md$/, ""),
          title: data.title,
          excerpt: data.excerpt,
          content: content.trim(),
          contentFormat: "markdown",
          status: data.draft ? "draft" : "published",
          featured: Boolean(data.featured),
          coverSrc: data.cover?.src,
          coverAlt: data.cover?.alt,
          coverWidth: data.cover?.width,
          coverHeight: data.cover?.height,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          authorId: author.id,
          publishedAt,
          createdAt: publishedAt,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : publishedAt,
        })
        .returning({ id: schema.posts.id });

      const slugs: string[] = data.tags ?? [];
      if (slugs.length) {
        await tx.insert(schema.postTags).values(
          slugs.map((slug, position) => {
            const tagId = tagIds.get(slug);
            if (!tagId) throw new Error(`Unknown tag "${slug}" in ${file}`);
            return { postId: post.id, tagId, position };
          }),
        );
      }
    }
    console.log(`✓ imported ${files.length} posts, ${insertedTags.length} tags, 1 author`);
  });
}

process.exit(0);
