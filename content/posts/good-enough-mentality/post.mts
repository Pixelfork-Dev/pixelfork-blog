import { readFileSync } from "node:fs";
import type { PostPackage } from "../types.ts";

/** Migrated from the old Framer blog (https://blog.pixelfork.ai/blog/good-enough-mentality) on 2026-09-17. */
const post: PostPackage = {
  slug: "good-enough-mentality",
  title: "The Good Enough Mentality in Game Development",
  excerpt: "\u201cIs it production-ready?\u201d is the wrong question. The one that matters is whether it's good enough to get you to a playable \u2014 because that's where most games die.",
  seoTitle: "The Good Enough Mentality in Game Development",
  seoDescription: "Most games die before they're playable. Why \u201cis it good enough to reach a playable?\u201d is a better question than \u201cis it production-ready?\u201d",
  focusKeyword: "good enough mentality",
  tags: ["insights", "pro-tips"],
  cover: { file: "cover.webp", alt: "Illustration contrasting an unfinished perfect plan with a small finished playable game" },
  bodyHtml: readFileSync(new URL("./body.html", import.meta.url), "utf8"),
};

export default post;
