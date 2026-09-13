/**
 * Generates a blog cover with Nano Banana 2 (Gemini API) in the fixed Pixelfork style.
 *
 *   npm run cover -- <slug> "<subject>" --style <style> [--out path.webp]
 *
 * Styles live in scripts/lib/cover-styles.mts (vibrant-diorama, flat-vector, pixel-art, paper-cut, blueprint,
 * cinematic-3d). Without --style the original dark diorama look is used with reference images.
 *
 * - The API key is read from the macOS Keychain (account "pixelfork-blog", service "GEMINI_API_KEY")
 *   and is never printed or written to disk.
 * - The model is fixed; this script can't call any other model.
 * - Two existing covers are sent as style references so every cover matches the set.
 * - Every call is appended to content-plan/image-log.csv (date, slug, tokens, estimated cost).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BRAND_RULES, COVER_STYLES } from "./lib/cover-styles.mts";

const MODEL = "gemini-3.1-flash-image";
// USD per token (Gemini API pricing for this model at the time of writing).
const PRICE = { input: 0.5 / 1e6, textOutput: 3 / 1e6, imageOutput: 60 / 1e6 };
const REFERENCES = ["content/posts/how-to-make-a-video-game/cover.webp", "content/posts/what-is-an-npc/cover.webp"];

const STYLE = `Style: stylized 3D game-art illustration, miniature low-poly diorama, smooth shapes with soft rounded edges, matte materials, soft studio lighting with a warm orange rim light, subtle depth of field.
Palette: deep charcoal background (#1c1c1c) with soft gradients, Pixelfork orange (#F26207) as the main accent, muted teal (#3a6f7a) as secondary, off-white highlights, muted natural greens allowed.
Mood: optimistic, crafted, calm "game developer's workshop".
Rules: no text, no letters, no numbers, no symbols or icons printed on objects (coins, flags and signs stay blank), no logos, no watermarks, no UI text, no real brand marks, no people's faces, no borders or frames, no clutter, not photorealistic.
Composition: wide 16:9 banner, subject centered and filling about 60% of the frame, generous safe empty margin on all sides, three-quarter view from slightly above.`;

const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const out = outFlag >= 0 ? args.splice(outFlag, 2)[1] : null;
const styleFlag = args.indexOf("--style");
const styleName = styleFlag >= 0 ? args.splice(styleFlag, 2)[1] : null;
const style = styleName ? COVER_STYLES[styleName] : null;
if (styleName && !style) {
  console.error(`✗ Unknown style "${styleName}". Available: ${Object.keys(COVER_STYLES).join(", ")}`);
  process.exit(1);
}
const [slug, subject] = args;
if (!slug || !subject) {
  console.error('Usage: npm run cover -- <slug> "<subject>" [--out path.webp]');
  process.exit(1);
}

function apiKey() {
  try {
    return execFileSync("security", ["find-generic-password", "-a", "pixelfork-blog", "-s", "GEMINI_API_KEY", "-w"], { encoding: "utf8" }).trim();
  } catch {
    console.error("✗ GEMINI_API_KEY not found in the Keychain (account pixelfork-blog).");
    process.exit(1);
  }
}

// Reference images lock the look, so they're only used for the legacy style; library styles vary on purpose.
const references = style ? [] : await Promise.all(
  REFERENCES.map(async (file) => ({
    inlineData: { mimeType: "image/jpeg", data: (await sharp(await fs.readFile(file)).resize(960).jpeg({ quality: 85 }).toBuffer()).toString("base64") },
  })),
);

const prompt = style
  ? `Create a blog cover illustration for a game development blog.

${style.prompt}

${BRAND_RULES}

Subject: ${subject}`
  : `Create a new blog cover illustration. Match the art style, lighting, materials and palette of the reference images exactly, but with a new subject.

${STYLE}

Subject: ${subject}`;

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
  body: JSON.stringify({
    contents: [{ parts: [...references, { text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9", imageSize: "2K" } },
  }),
});
const data = await res.json();
if (!res.ok) {
  console.error(`✗ ${res.status} ${data.error?.status ?? ""}: ${String(data.error?.message ?? "").slice(0, 300)}`);
  process.exit(1);
}

const part = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string } }) => p.inlineData);
if (!part) {
  console.error(`✗ No image returned (finish reason: ${data.candidates?.[0]?.finishReason ?? "unknown"}).`);
  process.exit(1);
}

const target = out ?? path.join("content", "posts", slug, "cover.webp");
await fs.mkdir(path.dirname(target), { recursive: true });
const image = sharp(Buffer.from(part.inlineData.data, "base64"));
const meta = await image.metadata();
await image.resize(1600, 900, { fit: "cover" }).webp({ quality: 88 }).toFile(target);

const usage = data.usageMetadata ?? {};
const imageTokens = (usage.candidatesTokensDetails ?? []).find((d: { modality: string }) => d.modality === "IMAGE")?.tokenCount ?? usage.candidatesTokenCount ?? 0;
const cost = (usage.promptTokenCount ?? 0) * PRICE.input + imageTokens * PRICE.imageOutput + ((usage.thoughtsTokenCount ?? 0) * PRICE.textOutput);
const log = path.join("content-plan", "image-log.csv");
const header = (await fs.access(log).then(() => true, () => false)) ? "" : "date,slug,model,prompt_tokens,image_tokens,est_cost_usd\n";
await fs.appendFile(log, `${header}${new Date().toISOString()},${slug}${styleName ? `:${styleName}` : ""},${MODEL},${usage.promptTokenCount ?? 0},${imageTokens},${cost.toFixed(4)}\n`);

console.log(`✓ ${target} (source ${meta.width}×${meta.height}) · ~$${cost.toFixed(3)}`);
