import type { NextConfig } from "next";

/**
 * GITHUB_PAGES=true builds a fully static export (./out) for GitHub Pages:
 * no Node server, so no image optimization or custom headers, and the app lives under a sub-path.
 * Normal builds (Vercel, Node) keep all server features.
 */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  basePath: basePath || undefined,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Cover images are long-lived; cache optimized variants for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    unoptimized: isGithubPages,
  },
  ...(isGithubPages
    ? // trailingSlash writes page/index.html, avoiding "page.html next to page/" clashes on GitHub Pages.
      { output: "export" as const, trailingSlash: true }
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
