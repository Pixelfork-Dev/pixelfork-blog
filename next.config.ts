import type { NextConfig } from "next";

// Keep in sync with src/config/site.ts: the base path comes from the public URL (https://pixelfork.ai/blog → /blog).
const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixelfork.ai/blog");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? siteUrl.pathname).replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  basePath: basePath || undefined,
  // Files read at runtime by the social image routes.
  outputFileTracingIncludes: { "/posts/*/opengraph-image*": ["./src/assets/fonts/**", "./public/logo.svg", "./public/images/**"] },
  experimental: {
    // The admin's server actions are posted to pixelfork.ai and proxied here by the main site's rewrite.
    serverActions: { allowedOrigins: [siteUrl.host] },
  },
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Cover images are long-lived; cache optimized variants for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Google profile pictures in the admin panel.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Uploaded media (admin → Media) on Vercel Blob.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async redirects() {
    // Direct visits to the blog project's own domain (e.g. *.vercel.app/) land on the blog.
    // On pixelfork.ai the root belongs to the main site, which only forwards /blog/* here.
    return basePath ? [{ source: "/", destination: basePath, basePath: false, permanent: false }] : [];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
