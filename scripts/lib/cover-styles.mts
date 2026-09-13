/**
 * Art direction library for AI covers (type A). Each style has its own look and palette so covers
 * stay varied; shared brand rules keep them recognisably Pixelfork.
 */

export const BRAND_RULES = `Brand rules: Pixelfork orange (#F26207) must appear as a clear accent somewhere in the image.
No text, letters, numbers, logos, watermarks, UI text, symbols printed on objects or real brand marks. No realistic human faces.
Wide 16:9 banner. One clear focal subject, centered, filling about 60% of the frame, with safe margins on all sides so it can be cropped.
Rich, vivid color. Not dark and muted.`;

export interface CoverStyle {
  name: string;
  /** Short label for reports and the sampler. */
  label: string;
  prompt: string;
  /** Topics this style suits best (used when picking a style for an article). */
  bestFor: string;
}

export const COVER_STYLES: Record<string, CoverStyle> = {
  "vibrant-diorama": {
    name: "vibrant-diorama",
    label: "Vibrant isometric diorama",
    bestFor: "worlds, levels, game design, genres",
    prompt: `Style: bright stylized 3D isometric diorama, chunky low-poly shapes with rounded edges, glossy toy-like materials, sunny daylight with soft shadows.
Palette: saturated sky blue background gradient, lush greens, candy pink and yellow accents, Pixelfork orange highlights.`,
  },
  "flat-vector": {
    name: "flat-vector",
    label: "Bold flat vector",
    bestFor: "business, monetization, marketing, strategy",
    prompt: `Style: bold modern flat vector illustration, large simple geometric shapes, subtle grain texture, long soft shadows, clean outlines-free forms, editorial magazine look.
Palette: vivid gradient background from deep violet to hot pink, mint green and sunny yellow shapes, Pixelfork orange as the key accent.`,
  },
  "pixel-art": {
    name: "pixel-art",
    label: "Pixel-art scene",
    bestFor: "2D games, retro, platformers, sprites",
    prompt: `Style: detailed 16-bit pixel art scene, crisp visible pixels, limited but bright palette, dithered sky, parallax layers, charming retro game atmosphere.
Palette: twilight purple and teal sky, warm orange sunset glow, bright green foliage, gold highlights.`,
  },
  "clay-toy": {
    name: "clay-toy",
    label: "Clay / toy 3D",
    bestFor: "beginner guides, friendly how-tos, testing, teams",
    prompt: `Style: soft claymation-style 3D render, plasticine materials with visible fingerprint texture, rounded cute proportions, tilt-shift miniature depth of field, cheerful studio lighting.
Palette: pastel peach background, cream, baby blue, lime green and Pixelfork orange pieces.`,
  },
  "paper-cut": {
    name: "paper-cut",
    label: "Layered paper-cut",
    bestFor: "planning, documents, storytelling, design process",
    prompt: `Style: layered paper-cut craft illustration, several stacked paper layers with soft drop shadows, visible paper texture and cut edges, handmade diorama feel.
Palette: layers of turquoise, deep teal, warm yellow, coral and Pixelfork orange on a light sand background.`,
  },
  "neon-synthwave": {
    name: "neon-synthwave",
    label: "Neon synthwave",
    bestFor: "AI, technology, performance, the future of games",
    prompt: `Style: glowing neon synthwave illustration, retro-futuristic grid floor fading to the horizon, light trails, bloom and haze, sleek stylized 3D objects. Any screens show only glowing abstract shapes, never code or text.
Palette: deep indigo night background, electric magenta and cyan neon, Pixelfork orange glow as the brightest light.`,
  },
  blueprint: {
    name: "blueprint",
    label: "Blueprint + color",
    bestFor: "tutorials, technical guides, systems, controllers",
    prompt: `Style: technical blueprint drawing with white construction lines, dimension arrows and grid (no numbers or labels anywhere), where the main subject pops out as a fully colored glossy 3D object breaking out of the flat drawing.
Palette: rich cobalt blue blueprint background, white line work, the 3D subject in Pixelfork orange, yellow and mint.`,
  },
  "cinematic-3d": {
    name: "cinematic-3d",
    label: "Cinematic 3D render",
    bestFor: "3D games, engines, epic genres, showcases",
    prompt: `Style: cinematic stylized 3D render like a modern animated film still, dramatic volumetric light rays, atmospheric depth, detailed materials, heroic low camera angle.
Palette: golden hour sunlight, deep turquoise shadows, warm Pixelfork orange light accents, lush saturated environment.`,
  },
};
