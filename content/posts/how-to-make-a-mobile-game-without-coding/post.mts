import { readFileSync } from "node:fs";
import type { PostPackage } from "../types.ts";

/** Migrated from the old Framer blog (https://blog.pixelfork.ai/blog/how-to-make-a-mobile-game-without-coding-in-2026-from-prompt-to-google-play) on 2026-09-17. */
const post: PostPackage = {
  slug: "how-to-make-a-mobile-game-without-coding",
  title: "How to Make a Mobile Game Without Coding in 2026",
  excerpt: "Ten years ago this meant learning a programming language and an engine. Today it starts with a sentence \u2014 here's the full path from prompt to Google Play.",
  seoTitle: "How to Make a Mobile Game Without Coding (2026)",
  seoDescription: "Make a mobile game without coding in 2026: describe it in plain language, iterate on the playable result, then export an Android build for Google Play.",
  focusKeyword: "make a mobile game without coding",
  tags: ["tutorial", "mobile-game-dev", "distribution"],
  cover: { file: "cover.webp", alt: "Illustration of a mobile game being built from a written prompt and published to an app store" },
  bodyHtml: readFileSync(new URL("./body.html", import.meta.url), "utf8"),
};

export default post;
