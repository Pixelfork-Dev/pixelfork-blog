/**
 * An article package: everything needed to (re)create a post with `npm run post:publish`.
 *
 * Image rules: only the cover is AI-generated. Inside the article use code-built infographics
 * (`graphics`), real screenshots (`screenshots`), or `placeholders` that ask a human for a real screenshot.
 * Reference images in the Markdown body with a line of their own: {{img:key|Caption text}}
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
  body: string;
}
