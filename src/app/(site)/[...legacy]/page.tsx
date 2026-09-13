import { redirectOrNotFound } from "@/lib/redirects";
import { notFoundMetadata } from "@/lib/seo";

/**
 * Catches every URL no other route matches: follows manual redirects (e.g. old blog URLs)
 * and otherwise renders the 404 page. Rendered per request so unknown URLs aren't cached.
 */
export const dynamic = "force-dynamic";
export const metadata = notFoundMetadata;

export default async function LegacyPath({ params }: PageProps<"/[...legacy]">) {
  const { legacy } = await params;
  return redirectOrNotFound(`/${legacy.join("/")}`);
}
