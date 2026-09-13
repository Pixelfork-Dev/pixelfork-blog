import type { Author, Tag } from "./types";

/** Order here is the order of the category bar. */
export const tags: Tag[] = [
  {
    slug: "tutorial",
    name: "Tutorial",
    description: "Step-by-step game development tutorials for engines, tools and techniques.",
  },
  {
    slug: "insights",
    name: "Insights",
    description: "Insights and lessons learned from building, shipping and growing games.",
  },
  {
    slug: "mobile-game-dev",
    name: "Mobile Game Dev",
    description: "Guides for designing, building and optimizing games for iOS and Android.",
  },
  {
    slug: "pro-tips",
    name: "Pro Tips",
    description: "Practical, battle-tested tips to make better games faster.",
  },
  {
    slug: "monetization",
    name: "Monetization",
    description: "Ads, in-app purchases, premium pricing and other ways to earn from your game.",
  },
  {
    slug: "distribution",
    name: "Distribution",
    description: "Publishing, launching and marketing your game on stores and the web.",
  },
  {
    slug: "3d-game",
    name: "3D Game",
    description: "Techniques for 3D game design, level design, rendering and performance.",
  },
  {
    slug: "threejs",
    name: "ThreeJS",
    description: "Building fast, beautiful browser games with Three.js and WebGL.",
  },
  {
    slug: "2d-game",
    name: "2D Game",
    description: "Art pipelines, mechanics and engines for 2D games.",
  },
];

export const authors: Author[] = [
  {
    slug: "pixelfork-team",
    name: "Pixelfork Team",
    role: "Editorial",
    url: "https://pixelfork.com/about",
    bio: "The team behind Pixelfork, the platform for creating and sharing games.",
  },
];

export const defaultAuthor = authors[0];

export function getTagBySlug(slug: string) {
  return tags.find((t) => t.slug === slug);
}

export function getAuthorBySlug(slug: string) {
  return authors.find((a) => a.slug === slug);
}
