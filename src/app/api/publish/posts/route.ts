import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiRoute, ApiError, assertDailyLimit, authenticate } from "@/lib/api/tokens";
import { sanitizePostHtml } from "@/lib/sanitize";

// Media URLs: absolute on Vercel Blob, root-relative for local uploads.
const mediaUrl = z.string().max(500).regex(/^(https:\/\/|\/)/, "must be a media URL");
const imageRef = z.object({ src: mediaUrl, alt: z.string().trim().min(1).max(200), width: z.number().int().positive(), height: z.number().int().positive() });

const input = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase words separated by hyphens").max(120),
  title: z.string().trim().min(10).max(120),
  excerpt: z.string().trim().min(50).max(300),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  focusKeyword: z.string().trim().max(80).optional(),
  tags: z.array(z.string()).min(1).max(5),
  author: z.string().default("pixelfork-team"),
  cover: imageRef.optional(),
  html: z.string().min(500).max(300_000),
});

/** Every image in a post must have been uploaded through this API (or the admin), so it lives in our media table. */
async function assertKnownMedia(urls: string[]) {
  if (!urls.length) return;
  const rows = await db.select({ url: schema.media.url }).from(schema.media).where(inArray(schema.media.url, urls));
  const known = new Set(rows.map((r) => r.url));
  const unknown = urls.filter((u) => !known.has(u));
  if (unknown.length) throw new ApiError(400, `Upload images through /api/publish/media first: ${unknown.slice(0, 3).join(", ")}`);
}

/** Publishing API: create a draft post. Posts are never published or overwritten through the API. */
export const POST = apiRoute(async (request: Request) => {
  const token = await authenticate(request, "drafts:create");
  await assertDailyLimit(token.id, "posts");

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const data = parsed.data;

  if (await db.query.posts.findFirst({ where: eq(schema.posts.slug, data.slug), columns: { id: true } })) {
    throw new ApiError(409, `A post with the slug "${data.slug}" already exists.`);
  }

  const content = sanitizePostHtml(data.html);
  const imageUrls = [...content.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  await assertKnownMedia([...imageUrls, ...(data.cover ? [data.cover.src] : [])]);

  const author = await db.query.authors.findFirst({ where: eq(schema.authors.slug, data.author), columns: { id: true } });
  if (!author) throw new ApiError(400, `Unknown author "${data.author}".`);
  const tagRows = await db.select().from(schema.tags).where(inArray(schema.tags.slug, data.tags));
  const missing = data.tags.filter((t) => !tagRows.some((r) => r.slug === t));
  if (missing.length) throw new ApiError(400, `Unknown tags: ${missing.join(", ")}`);

  const post = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.posts)
      .values({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content,
        contentFormat: "html",
        status: "draft",
        coverSrc: data.cover?.src ?? null,
        coverAlt: data.cover?.alt ?? null,
        coverWidth: data.cover?.width ?? null,
        coverHeight: data.cover?.height ?? null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        focusKeyword: data.focusKeyword || null,
        authorId: author.id,
        createdById: token.createdById,
        createdByTokenId: token.id,
      })
      .returning({ id: schema.posts.id, slug: schema.posts.slug });
    await tx.insert(schema.postTags).values(data.tags.map((slug, position) => ({ postId: row.id, tagId: tagRows.find((t) => t.slug === slug)!.id, position })));
    return row;
  });

  return NextResponse.json({ id: post.id, slug: post.slug, status: "draft", editUrl: `/admin/posts/${post.id}` }, { status: 201 });
});
