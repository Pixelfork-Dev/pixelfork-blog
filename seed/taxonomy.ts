/**
 * Starting tags and author, imported into an empty database by `npm run db:setup`.
 * After that the database is the source of truth (managed in /admin).
 */

export const seedTags = [
  { slug: "tutorial", name: "Tutorial", description: "Step-by-step game development tutorials for engines, tools and techniques." },
  { slug: "insights", name: "Insights", description: "Insights and lessons learned from building, shipping and growing games." },
  { slug: "mobile-game-dev", name: "Mobile Game Dev", description: "Guides for designing, building and optimizing games for iOS and Android." },
  { slug: "pro-tips", name: "Pro Tips", description: "Practical, battle-tested tips to make better games faster." },
  { slug: "monetization", name: "Monetization", description: "Ads, in-app purchases, premium pricing and other ways to earn from your game." },
  { slug: "distribution", name: "Distribution", description: "Publishing, launching and marketing your game on stores and the web." },
  { slug: "3d-game", name: "3D Game", description: "Techniques for 3D game design, level design, rendering and performance." },
  { slug: "threejs", name: "ThreeJS", description: "Building fast, beautiful browser games with Three.js and WebGL." },
  { slug: "2d-game", name: "2D Game", description: "Art pipelines, mechanics and engines for 2D games." },
];

export const seedAuthor = {
  slug: "pixelfork-team",
  name: "Pixelfork Team",
  jobTitle: "Editorial",
  websiteUrl: "https://pixelfork.ai/about",
  bio: "The team behind Pixelfork, the platform for creating and sharing games.",
};
