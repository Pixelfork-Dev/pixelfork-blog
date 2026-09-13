/**
 * An article package: everything needed to (re)create a post with `npm run post:publish`.
 *
 * Image rules: only the cover is AI-generated. Inside the article use code-built infographics
 * (`graphics`), real screenshots (`screenshots`), or `placeholders` that ask a human for a real screenshot.
 * Reference images in the Markdown body with a line of their own: {{img:key|Caption text}}
 * Posts written in the admin editor can instead ship `bodyHtml`, with image files referenced as src="{{file:images/x.webp}}".
 */
export interface PostPackage {
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  tags: string[];
  author?: string;
  featured?: boolean;
  cover: { file: string; alt: string };
  graphics?: Record<string, { alt: string; svg: string }>;
  screenshots?: Record<string, { file: string; alt: string; credit?: string }>;
  placeholders?: Record<string, { what: string; how: string }>;
  /** Markdown body (preferred for new articles). */
  body?: string;
  /** HTML body, e.g. exported from the admin editor. */
  bodyHtml?: string;
}
