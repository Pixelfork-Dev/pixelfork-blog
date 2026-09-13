"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import articleStyles from "@/components/Article/Article.module.css";
import styles from "./editor.module.css";

interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
  invalid?: boolean;
}

export function RichTextEditor({ initialHtml, onChange, invalid }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } },
      }),
      Image,
      Youtube.configure({ nocookie: true, width: 760, height: 428 }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Start writing… Use H2 for main sections." }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: `${articleStyles.prose} ${styles.editable}`,
        "aria-label": "Post content",
        "aria-invalid": invalid ? "true" : "false",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  return (
    <div className={`${styles.editorFrame} ${invalid ? styles.invalid : ""}`}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      inTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", previous ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const src = window.prompt("Image URL (https://…)");
    if (!src) return;
    const alt = window.prompt("Describe the image (alt text)") ?? "";
    chain().setImage({ src, alt }).run();
  };

  const addVideo = () => {
    const src = window.prompt("YouTube URL");
    if (src) chain().setYoutubeVideo({ src }).run();
  };

  const buttons: { label: string; title: string; active?: boolean; disabled?: boolean; run: () => void; divider?: boolean }[] = [
    { label: "H2", title: "Section heading", active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: "H3", title: "Subheading", active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    { label: "H4", title: "Minor heading", active: state.h4, run: () => chain().toggleHeading({ level: 4 }).run(), divider: true },
    { label: "B", title: "Bold (⌘B)", active: state.bold, run: () => chain().toggleBold().run() },
    { label: "I", title: "Italic (⌘I)", active: state.italic, run: () => chain().toggleItalic().run() },
    { label: "S", title: "Strikethrough", active: state.strike, run: () => chain().toggleStrike().run() },
    { label: "</>", title: "Inline code", active: state.code, run: () => chain().toggleCode().run() },
    { label: "Link", title: "Link (⌘K)", active: state.link, run: setLink, divider: true },
    { label: "• List", title: "Bullet list", active: state.bullet, run: () => chain().toggleBulletList().run() },
    { label: "1. List", title: "Numbered list", active: state.ordered, run: () => chain().toggleOrderedList().run() },
    { label: "Quote", title: "Quote", active: state.quote, run: () => chain().toggleBlockquote().run() },
    { label: "Code", title: "Code block", active: state.codeBlock, run: () => chain().toggleCodeBlock().run() },
    { label: "―", title: "Divider", run: () => chain().setHorizontalRule().run(), divider: true },
    { label: "Image", title: "Insert image", run: addImage },
    { label: "Video", title: "Embed YouTube video", run: addVideo },
    {
      label: state.inTable ? "Remove table" : "Table",
      title: state.inTable ? "Delete this table" : "Insert a 3×3 table",
      run: () => (state.inTable ? chain().deleteTable().run() : chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()),
      divider: true,
    },
    { label: "↶", title: "Undo (⌘Z)", disabled: !state.canUndo, run: () => chain().undo().run() },
    { label: "↷", title: "Redo (⇧⌘Z)", disabled: !state.canRedo, run: () => chain().redo().run() },
  ];

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      {buttons.map((b) => (
        <span key={b.title} className={b.divider ? styles.groupEnd : undefined}>
          <button
            type="button"
            title={b.title}
            aria-pressed={b.active ?? undefined}
            disabled={b.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.run}
            className={styles.toolButton}
          >
            {b.label}
          </button>
        </span>
      ))}
    </div>
  );
}
