import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Refresh every public page after content changes. Blog pages share data (home, tag pages,
 * related posts, RSS, sitemap), so the whole public tree is revalidated at once — at blog
 * scale that's cheap, and pages regenerate lazily on their next visit.
 */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
}
