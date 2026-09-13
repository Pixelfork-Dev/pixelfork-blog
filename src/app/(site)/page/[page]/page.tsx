import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/BlogIndex";
import { getAllPosts, paginateHome, parsePageParam } from "@/lib/posts";
import { buildPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export const dynamicParams = true;

export async function generateStaticParams() {
  const { totalPages } = paginateHome(await getAllPosts(), 1);
  return Array.from({ length: totalPages - 1 }, (_, i) => ({ page: String(i + 2) }));
}

export async function generateMetadata({ params }: PageProps<"/page/[page]">): Promise<Metadata> {
  const page = parsePageParam((await params).page);
  if (!page) return {};
  return buildPageMetadata({
    title: `All articles — Page ${page}`,
    description: `Page ${page} of game development tutorials, tips and insights from the ${siteConfig.name}.`,
    path: `/page/${page}`,
  });
}

export default async function PaginatedHomePage({ params }: PageProps<"/page/[page]">) {
  const page = parsePageParam((await params).page);
  if (!page) notFound();
  // Pages past the end must be real 404s, not empty 200s (soft 404s hurt SEO).
  const { totalPages } = paginateHome(await getAllPosts(), 1);
  if (page > totalPages) notFound();
  return <BlogIndex page={page} />;
}
