import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorIndex } from "@/components/AuthorIndex";
import { getActiveAuthors, getAuthorBySlug, getPostsByAuthor, paginate, parsePageParam } from "@/lib/posts";
import { redirectOrNotFound } from "@/lib/redirects";
import { buildPageMetadata, notFoundMetadata } from "@/lib/seo";

/** /authors/[slug] and /authors/[slug]/page/[n]. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const params: { slug: string; pagination: string[] }[] = [];
  for (const author of await getActiveAuthors()) {
    params.push({ slug: author.slug, pagination: [] });
    const { totalPages } = paginate(await getPostsByAuthor(author.slug), 1);
    for (let p = 2; p <= totalPages; p++) params.push({ slug: author.slug, pagination: ["page", String(p)] });
  }
  return params;
}

function parsePagination(segments: string[] | undefined) {
  if (!segments || segments.length === 0) return 1;
  if (segments.length === 2 && segments[0] === "page") return parsePageParam(segments[1]);
  return null;
}

export async function generateMetadata({ params }: PageProps<"/authors/[slug]/[[...pagination]]">): Promise<Metadata> {
  const { slug, pagination } = await params;
  const author = await getAuthorBySlug(slug);
  const page = parsePagination(pagination);
  if (!author || !page) return notFoundMetadata;
  const description =
    author.bio ?? `Articles by ${author.name}${author.role ? `, ${author.role}` : ""} on the Pixelfork Blog.`;
  const meta = buildPageMetadata({
    title: page > 1 ? `${author.name} — Page ${page}` : author.name,
    description,
    path: page > 1 ? `/authors/${author.slug}/page/${page}` : `/authors/${author.slug}`,
  });
  return { ...meta, openGraph: { ...meta.openGraph, type: "profile" } };
}

export default async function AuthorPage({ params }: PageProps<"/authors/[slug]/[[...pagination]]">) {
  const { slug, pagination } = await params;
  const [author, page] = [await getAuthorBySlug(slug), parsePagination(pagination)];
  if (!author) return redirectOrNotFound(`/authors/${slug}`);
  if (!page) notFound();
  return <AuthorIndex author={author} page={page} />;
}
