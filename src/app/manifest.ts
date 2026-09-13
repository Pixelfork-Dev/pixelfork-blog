import type { MetadataRoute } from "next";
import { assetPath, siteConfig } from "@/config/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: assetPath("/"),
    display: "standalone",
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    icons: [
      { src: assetPath("/icon.svg"), sizes: "any", type: "image/svg+xml" },
      { src: assetPath("/apple-icon.png"), sizes: "150x150", type: "image/png" },
    ],
  };
}
