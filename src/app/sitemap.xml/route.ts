import type { MetadataRoute } from "next";
import { pageHref } from "@/components/Pagination";
import { absoluteUrl } from "@/config/site";
import { getActiveAuthors, getActiveTags, getAllPosts, getPostsByAuthor, getPostsByTag, paginate, paginateHome } from "@/lib/posts";

export const dynamic = "force-static";
// Also refreshed on publish; the interval makes scheduled posts appear on time. This is a route
// handler rather than Next's sitemap.ts metadata file because revalidatePath() doesn't invalidate
// metadata routes, so published posts only reached the sitemap on the next deploy.
export const revalidate = 600;

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

async function entries(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const latest = posts[0]?.updatedAt ?? new Date().toISOString();
  const urls: MetadataRoute.Sitemap = [];

  const { totalPages } = paginateHome(posts, 1);
  for (let p = 1; p <= totalPages; p++) {
    urls.push({
      url: absoluteUrl(pageHref("/", p)),
      lastModified: latest,
      changeFrequency: "daily",
      priority: p === 1 ? 1 : 0.5,
    });
  }

  // Hidden (noindex) and cross-posted (canonical elsewhere) articles don't belong in our sitemap.
  for (const post of posts.filter((p) => !p.noindex && !p.canonicalUrl)) {
    urls.push({
      url: absoluteUrl(`/posts/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [absoluteUrl(post.cover.src)],
    });
  }

  for (const tag of await getActiveTags()) {
    const tagPosts = await getPostsByTag(tag.slug);
    const { totalPages: tagPages } = paginate(tagPosts, 1);
    for (let p = 1; p <= tagPages; p++) {
      urls.push({
        url: absoluteUrl(pageHref(`/tag/${tag.slug}`, p)),
        lastModified: tagPosts[0].updatedAt,
        changeFrequency: "weekly",
        priority: p === 1 ? 0.6 : 0.4,
      });
    }
  }

  for (const author of await getActiveAuthors()) {
    const authorPosts = await getPostsByAuthor(author.slug);
    urls.push({
      url: absoluteUrl(`/authors/${author.slug}`),
      lastModified: authorPosts[0].updatedAt,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return urls;
}

export async function GET() {
  const urls = (await entries())
    .map((entry) => {
      const images = (entry.images ?? [])
        .map((src) => `    <image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`)
        .join("\n");
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${new Date(entry.lastModified ?? Date.now()).toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>${images ? `\n${images}` : ""}
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
