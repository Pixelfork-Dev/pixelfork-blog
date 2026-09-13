import { siteConfig } from "@/config/site";
import { ogSize, renderOgImage } from "@/lib/og";

export const alt = siteConfig.title;
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Image() {
  return renderOgImage({
    eyebrow: "Blog",
    title: "Game development tutorials, tips & insights",
    footer: siteConfig.url.replace(/^https?:\/\//, ""),
  });
}
