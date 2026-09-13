import { BlogIndex } from "@/components/BlogIndex";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ path: "/" });

export default function HomePage() {
  return <BlogIndex page={1} />;
}
