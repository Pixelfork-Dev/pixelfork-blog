/**
 * Central site configuration. Everything SEO- and brand-related reads from here,
 * so moving the blog to another domain (or a /blog sub-path) is a one-line change.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixelfork.ai/blog").replace(/\/$/, "");

export const siteConfig = {
  name: "Pixelfork Blog",
  shortName: "Pixelfork",
  // Public URL including the sub-path, no trailing slash. The base path ("/blog") is derived from it.
  url: SITE_URL,
  mainSiteUrl: "https://pixelfork.ai",
  title: "Pixelfork Blog — Game Development Tutorials, Tips & Insights",
  description:
    "Tutorials, pro tips and insights on game development: Unity, Three.js, 2D and 3D games, mobile game dev, monetization and distribution — from the Pixelfork team.",
  locale: "en_US",
  language: "en",
  twitterHandle: "@pixelfork_ai",
  themeColor: "#1c1c1c",
  brandColor: "#F26207",
  logo: "/logo.svg",
  postsPerPage: 9,
  /** On the first page the top 3 posts are featured, the rest fill the grid. */
  featuredCount: 3,
} as const;

export const mainNav = [
  { label: "Community", href: "https://discord.gg/6sjEPmumEU" },
  { label: "Docs", href: `${siteConfig.mainSiteUrl}/docs` },
] as const;

export const ctaLink = {
  label: "Create your own game",
  href: "https://www.pixelfork.ai",
} as const;

export const socialLinks = [
  { label: "X", icon: "/icons/x.svg", href: "https://x.com/pixelfork_ai" },
  { label: "Instagram", icon: "/icons/instagram.svg", href: "https://www.instagram.com/pixelfork.ai" },
  { label: "YouTube", icon: "/icons/youtube.svg", href: "https://www.youtube.com/@Pixelforkk" },
  { label: "Discord", icon: "/icons/discord.svg", href: "https://discord.gg/6sjEPmumEU" },
  { label: "Reddit", icon: "/icons/reddit.svg", href: "https://www.reddit.com/r/pixelfork/" },
] as const;

export const footerLinks = [
  { label: "About", href: `${siteConfig.mainSiteUrl}/about` },
  { label: "Privacy Policy", href: `${siteConfig.mainSiteUrl}/privacy` },
  { label: "T&C", href: `${siteConfig.mainSiteUrl}/terms` },
] as const;

/**
 * Sub-path the app is served from: "/blog" on pixelfork.ai (the main site rewrites /blog/* to this app).
 * Must match `basePath` in next.config.ts. next/link and redirect() add it automatically; plain URLs
 * (next/image src, <a href>, fetch, article HTML) need assetPath().
 */
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? new URL(SITE_URL).pathname).replace(/\/$/, "");

/** Preview deployments (like GitHub Pages) set this so they never compete with the real domain in search. */
export const noindex = process.env.NEXT_PUBLIC_NOINDEX === "true";

export function assetPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || !basePath) return path;
  if (path === "/") return basePath;
  return path === basePath || path.startsWith(`${basePath}/`) ? path : `${basePath}${path}`;
}

/** siteConfig.url already includes the base path, so this is correct for both hosting modes. */
export function absoluteUrl(path = "/") {
  // The home page is /blog, not /blog/ (Next redirects the trailing slash away).
  if (path === "/" || path === "") return siteConfig.url;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Links that leave Pixelfork (e.g. Discord) open in a new tab. */
export function externalLinkProps(href: string) {
  const host = new URL(href, siteConfig.mainSiteUrl).hostname.replace(/^www\./, "");
  return host === new URL(siteConfig.mainSiteUrl).hostname.replace(/^www\./, "") ? {} : { target: "_blank", rel: "noopener noreferrer" };
}
