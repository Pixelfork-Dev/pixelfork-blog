import type { MetadataRoute } from "next";
import { pageHref } from "@/components/Pagination";
import { absoluteUrl } from "@/config/site";
import { getActiveAuthors, getActiveTags, getAllPosts, getPostsByAuthor, getPostsByTag, paginate, paginateHome } from "@/lib/posts";

export const dynamic = "force-static";
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const latest = posts[0]?.updatedAt ?? new Date().toISOString();
  const entries: MetadataRoute.Sitemap = [];

  const { totalPages } = paginateHome(posts, 1);
  for (let p = 1; p <= totalPages; p++) {
    entries.push({
      url: absoluteUrl(pageHref("/", p)),
      lastModified: latest,
      changeFrequency: "daily",
      priority: p === 1 ? 1 : 0.5,
    });
  }

  // Hidden (noindex) and cross-posted (canonical elsewhere) articles don't belong in our sitemap.
  for (const post of posts.filter((p) => !p.noindex && !p.canonicalUrl)) {
    entries.push({
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
      entries.push({
        url: absoluteUrl(pageHref(`/tag/${tag.slug}`, p)),
        lastModified: tagPosts[0].updatedAt,
        changeFrequency: "weekly",
        priority: p === 1 ? 0.6 : 0.4,
      });
    }
  }

  for (const author of await getActiveAuthors()) {
    const authorPosts = await getPostsByAuthor(author.slug);
    entries.push({
      url: absoluteUrl(`/authors/${author.slug}`),
      lastModified: authorPosts[0].updatedAt,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}
