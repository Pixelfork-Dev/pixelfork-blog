import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import rehypeExternalLinks from "rehype-external-links";
import rehypeParse from "rehype-parse";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { TocItem } from "./types";

/**
 * Article rendering. Posts are stored either as Markdown (imported starter content) or as
 * sanitized HTML from the admin editor; both go through the same enrichment pipeline.
 */

/** Collects h2/h3 headings (after rehype-slug assigned ids) into a table of contents. */
function rehypeToc(toc: TocItem[]) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if ((node.tagName === "h2" || node.tagName === "h3") && node.properties?.id) {
        toc.push({
          id: String(node.properties.id),
          text: toString(node),
          depth: node.tagName === "h2" ? 2 : 3,
        });
      }
    });
  };
}

/** Lazy-load in-article images and embeds; the cover image is the LCP element, not these. */
function rehypeLazyMedia() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img" || node.tagName === "iframe") {
        node.properties = { ...node.properties, loading: "lazy", decoding: "async" };
      }
    });
  };
}

const externalLinkOptions = { target: "_blank" as const, rel: ["noopener", "noreferrer"] };

export async function renderMarkdown(markdown: string) {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeToc(toc))
    .use(rehypeLazyMedia)
    .use(rehypeExternalLinks, externalLinkOptions)
    .use(rehypeStringify)
    .process(markdown);

  return { html: String(file), toc };
}

/** Enrich already-sanitized editor HTML with heading ids, TOC, lazy media and safe external links. */
export async function renderHtml(html: string) {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSlug)
    .use(rehypeToc(toc))
    .use(rehypeLazyMedia)
    .use(rehypeExternalLinks, externalLinkOptions)
    .use(rehypeStringify)
    .process(html);

  return { html: String(file), toc };
}

/** Plain HTML for loading a Markdown post into the rich-text editor. */
export async function markdownToHtml(markdown: string) {
  const file = await unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify).process(markdown);
  return String(file);
}

export function countWords(content: string, format: "markdown" | "html" = "markdown") {
  const text =
    format === "html"
      ? content.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ")
      : content.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()!-]/g, " ");
  return text.split(/\s+/).filter(Boolean).length;
}
