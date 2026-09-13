import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TagIndex } from "@/components/TagIndex";
import { getActiveTags, getPostsByTag, getTagBySlug, paginate, parsePageParam } from "@/lib/posts";
import { redirectOrNotFound } from "@/lib/redirects";
import { buildPageMetadata, notFoundMetadata } from "@/lib/seo";

/**
 * Handles both /tag/[slug] and /tag/[slug]/page/[n] in one route, so every tag always
 * generates at least one page (required by static export).
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const params: { slug: string; pagination: string[] }[] = [];
  for (const tag of await getActiveTags()) {
    params.push({ slug: tag.slug, pagination: [] });
    const { totalPages } = paginate(await getPostsByTag(tag.slug), 1);
    for (let p = 2; p <= totalPages; p++) params.push({ slug: tag.slug, pagination: ["page", String(p)] });
  }
  return params;
}

/** [] → page 1, ["page", "n"] → n (n ≥ 2), anything else → null. */
function parsePagination(segments: string[] | undefined) {
  if (!segments || segments.length === 0) return 1;
  if (segments.length === 2 && segments[0] === "page") return parsePageParam(segments[1]);
  return null;
}

export async function generateMetadata({ params }: PageProps<"/tag/[slug]/[[...pagination]]">): Promise<Metadata> {
  const { slug, pagination } = await params;
  const tag = await getTagBySlug(slug);
  const page = parsePagination(pagination);
  if (!tag || !page) return notFoundMetadata;
  return buildPageMetadata({
    title: page > 1 ? `${tag.name} Articles — Page ${page}` : `${tag.name} Articles`,
    description: page > 1 ? `${tag.description} Page ${page}.` : tag.description,
    path: page > 1 ? `/tag/${tag.slug}/page/${page}` : `/tag/${tag.slug}`,
  });
}

export default async function TagPage({ params }: PageProps<"/tag/[slug]/[[...pagination]]">) {
  const { slug, pagination } = await params;
  const tag = await getTagBySlug(slug);
  const page = parsePagination(pagination);
  if (!tag) return redirectOrNotFound(`/tag/${slug}`);
  if (!page) notFound();
  return <TagIndex tag={tag} page={page} />;
}
