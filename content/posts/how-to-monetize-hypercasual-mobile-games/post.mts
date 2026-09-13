import { readFileSync } from "node:fs";
import type { PostPackage } from "../types.ts";

const post: PostPackage = {
  slug: "how-to-monetize-hypercasual-mobile-games",
  title: "How to Monetize Hypercasual Mobile Games",
  excerpt: "Learn how to monetize hypercasual mobile games with rewarded ads, smart interstitial placement, mediation and a remove-ads purchase, without hurting retention.",
  seoTitle: "How to Monetize Hypercasual Mobile Games: A Practical Guide",
  seoDescription: "Learn how to monetize hypercasual mobile games with rewarded ads, smart interstitial placement, mediation and a remove-ads purchase, without hurting retention.",
  focusKeyword: "monetize hypercasual mobile games",
  tags: ["monetization","mobile-game-dev","pro-tips"],
  featured: true,
  cover: { file: "cover.webp", alt: "Illustration of a tiny hypercasual runner game rising from a smartphone, with coins leading to a treasure chest" },
  // Written in the admin editor: HTML body with images referenced as {{file:images/...}}.
  bodyHtml: readFileSync(new URL("./body.html", import.meta.url), "utf8"),
};

export default post;
