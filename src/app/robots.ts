import type { MetadataRoute } from "next";
import { absoluteUrl, basePath, noindex } from "@/config/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // Keep non-production deployments (previews, staging) out of the index.
  const isProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";

  if (!isProduction || noindex) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // Crawlers only read /robots.txt at the domain root (the main site); this copy documents the rules
  // for /blog. Add `Sitemap: https://pixelfork.ai/blog/sitemap.xml` to the main site's robots.txt.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [`${basePath}/admin`, `${basePath}/api/`],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
