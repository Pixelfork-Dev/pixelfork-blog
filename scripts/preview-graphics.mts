/** Renders a package's infographics to PNG files for a visual check: npm run post:preview -- <slug> [outDir] */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [slug, out = path.join("content", "posts", slug, ".preview")] = process.argv.slice(2);
const pkg = (await import(path.join(process.cwd(), "content", "posts", slug, "post.mts"))).default;
await fs.mkdir(out, { recursive: true });
for (const [key, g] of Object.entries(pkg.graphics ?? {}) as [string, { svg: string }][]) {
  const file = path.join(out, `${key}.png`);
  await sharp(Buffer.from(g.svg)).png().toFile(file);
  console.log(file);
}
