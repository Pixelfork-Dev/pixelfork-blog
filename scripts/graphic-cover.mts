/**
 * Type C cover (code-built graphic, no AI):
 *   npm run cover:graphic -- <slug> <gauge|network|document|bars> <#color1> <#color2> [--out path.webp]
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { graphicCoverSvg, type GraphicTemplate } from "./lib/cover-graphic.mts";

const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const out = outFlag >= 0 ? args.splice(outFlag, 2)[1] : null;
const [slug, template, c1, c2] = args;
if (!slug || !["gauge", "network", "document", "bars"].includes(template) || !/^#[0-9a-f]{6}$/i.test(c1 ?? "") || !/^#[0-9a-f]{6}$/i.test(c2 ?? "")) {
  console.error("Usage: npm run cover:graphic -- <slug> <gauge|network|document|bars> <#color1> <#color2> [--out path.webp]");
  process.exit(1);
}
const target = out ?? path.join("content", "posts", slug, "cover.webp");
await fs.mkdir(path.dirname(target), { recursive: true });
await sharp(Buffer.from(graphicCoverSvg({ template: template as GraphicTemplate, colors: [c1, c2] }))).webp({ quality: 90 }).toFile(target);
console.log(`✓ ${target}`);
