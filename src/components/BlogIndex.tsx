import { getActiveTags, getAllPosts, paginateHome } from "@/lib/posts";
import { blogJsonLd } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { FeaturedPosts } from "./FeaturedPosts";
import { JsonLd } from "./JsonLd";
import { PageBand } from "./PageBand";
import { Pagination, pageHref } from "./Pagination";
import { PostGrid } from "./PostGrid";
import { TagBar } from "./TagBar";

/** Home page and its /page/n siblings share this view. */
export async function BlogIndex({ page }: { page: number }) {
  const [posts, tags] = await Promise.all([getAllPosts(), getActiveTags()]);
  const { featured, grid, totalPages } = paginateHome(posts, page);

  return (
    <>
      <JsonLd data={blogJsonLd([...featured, ...grid], pageHref("/", page))} />
      <PageBand>
        {/* The design keeps this band empty; the H1 stays available to crawlers and assistive tech. */}
        <h1 className="sr-only">
          {siteConfig.name}
          {page > 1 ? ` — Page ${page}` : ": game development tutorials, tips and insights"}
        </h1>
      </PageBand>
      {featured.length > 0 && <FeaturedPosts posts={featured} />}
      <TagBar tags={tags} />
      <section aria-label={page > 1 ? `Articles, page ${page}` : "Latest articles"}>
        <PostGrid posts={grid} priorityCount={page > 1 ? 3 : 0} />
      </section>
      <Pagination page={page} totalPages={totalPages} basePath="/" />
    </>
  );
}
