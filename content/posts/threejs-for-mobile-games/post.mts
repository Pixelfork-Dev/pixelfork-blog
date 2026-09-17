import { readFileSync } from "node:fs";
import type { PostPackage } from "../types.ts";

/** Migrated from the old Framer blog (https://blog.pixelfork.ai/blog/three.js-for-mobile-games) on 2026-09-17. */
const post: PostPackage = {
  slug: "threejs-for-mobile-games",
  title: "Three.js for Mobile Games",
  excerpt: "Most developers still think Three.js is for landing pages and product viewers. On mobile it's a genuinely capable 3D game runtime \u2014 here's the honest picture.",
  seoTitle: "Three.js for Mobile Games: What It's Good At",
  seoDescription: "Three.js runs real 3D games in a mobile browser. What it's genuinely good at, where it struggles, and why it fits AI-generated mobile games.",
  focusKeyword: "three.js for mobile games",
  tags: ["threejs", "mobile-game-dev", "3d-game"],
  cover: { file: "cover.webp", alt: "Illustration of a 3D scene rendered inside a mobile browser with Three.js" },
  bodyHtml: readFileSync(new URL("./body.html", import.meta.url), "utf8"),
};

export default post;
