"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { siteConfig } from "@/config/site";
import { slugify } from "@/lib/slug";
import type { MediaItem } from "../../media/actions";
import { MediaPicker } from "../../media/MediaPicker";
import { deletePost, returnForChanges, savePost, type PostInput, type SaveIntent, type SaveResult } from "../actions";
import { RichTextEditor } from "./RichTextEditor";
import { runSeoChecks, seoScore } from "./seoChecks";
import ui from "../../../admin.module.css";
import styles from "./editor.module.css";

export interface EditorPost extends Omit<PostInput, "loadedUpdatedAt"> {
  status: "draft" | "scheduled" | "published";
  createdById: string | null;
  /** Set while a contributor's draft waits for an editor. */
  reviewRequestedAt: string | null;
  /** Reviewer's note when the draft was sent back. */
  reviewNote: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

interface Props {
  post: EditorPost;
  tags: { id: string; name: string }[];
  authors: { id: string; name: string }[];
  /** Editors and admins publish and review; contributors save drafts and submit them. */
  canReview: boolean;
}

const COUNTS = { excerpt: [120, 160], seoTitle: [30, 60], seoDescription: [120, 160] } as const;

export function PostEditor({ post: initial, tags, authors, canReview }: Props) {
  const router = useRouter();
  const [post, setPost] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const searchParams = useSearchParams();
  // After creating a post we land on its edit URL with ?notice=… so the confirmation survives the navigation.
  const [result, setResult] = useState<SaveResult | null>(() => {
    const notice = searchParams.get("notice");
    if (notice === "published") return { ok: true, message: "Post published — it’s live now." };
    if (notice === "draft") return { ok: true, message: "Draft saved." };
    if (notice === "submitted") return { ok: true, message: "Submitted for review. An editor will publish it or send it back with notes." };
    if (notice === "scheduled") return { ok: true, message: "Post scheduled." };
    return null;
  });
  const [pending, startTransition] = useTransition();
  const [pendingIntent, setPendingIntent] = useState<SaveIntent | "delete" | "return" | null>(null);
  // One picker for both the cover and in-article images; `resolvePick` receives the chosen image.
  const [picker, setPicker] = useState<{ title: string; resolve: (item: MediaItem | null) => void } | null>(null);
  const pickImage = useCallback(
    (title: string) => new Promise<MediaItem | null>((resolve) => setPicker({ title, resolve })),
    [],
  );
  const closePicker = (item: MediaItem | null) => {
    picker?.resolve(item);
    setPicker(null);
  };

  const chooseCover = async () => {
    const item = await pickImage("Choose a cover image");
    if (!item) return;
    // A different image needs its own description: take the library's alt text (validation asks for one if it's empty).
    setPost((p) => ({
      ...p,
      coverSrc: item.url,
      coverAlt: item.url === p.coverSrc ? p.coverAlt || item.alt : item.alt,
      coverWidth: item.width,
      coverHeight: item.height,
    }));
  };

  // Captured once per editor session; good enough to tell scheduled from live and to set the picker minimum.
  const [now] = useState(() => Date.now());
  const isScheduled = post.status === "scheduled" && Boolean(post.publishedAt && new Date(post.publishedAt).getTime() > now);
  const isLive = post.status !== "draft" && !isScheduled;
  const [publishAt, setPublishAt] = useState(() => toLocalInput(isScheduled ? post.publishedAt : null));
  const [showSchedule, setShowSchedule] = useState(false);
  const seoChecks = useMemo(() => runSeoChecks(post), [post]);
  const score = seoScore(seoChecks);
  const dirty = useMemo(() => JSON.stringify(toInput(post)) !== JSON.stringify(toInput(saved)), [post, saved]);
  const errors = result?.fieldErrors ?? {};

  const update = <K extends keyof EditorPost>(key: K, value: EditorPost[K]) =>
    setPost((p) => {
      const next = { ...p, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });

  const run = useCallback(
    (intent: SaveIntent) => {
      if (pending) return;
      setPendingIntent(intent);
      startTransition(async () => {
        const res = await savePost(
          {
            ...toInput(post),
            loadedUpdatedAt: post.updatedAt ?? undefined,
            publishAt: intent === "schedule" && publishAt ? new Date(publishAt).toISOString() : null,
          },
          intent,
        );
        setResult(res);
        setPendingIntent(null);
        if (res.ok && res.post) {
          const next = {
            ...post,
            id: res.post.id,
            slug: res.post.slug,
            status: res.post.status,
            updatedAt: res.post.updatedAt,
            publishedAt: res.post.publishedAt,
            reviewRequestedAt: res.post.reviewRequestedAt,
            reviewNote: res.post.reviewNote,
          };
          setPost(next);
          setSaved(next);
          setSlugTouched(true);
          setShowSchedule(false);
          if (!post.id) router.replace(`/admin/posts/${res.post.id}?notice=${intent === "submit" ? "submitted" : res.post.status}`);
          else router.refresh();
        }
      });
    },
    [pending, post, publishAt, router],
  );

  const inReview = Boolean(post.reviewRequestedAt);
  // Contributors can't change a draft while it waits for review.
  const locked = !canReview && inReview;

  const sendBack = () => {
    if (!post.id) return;
    const note = window.prompt("What should the author change? They'll see this note in the editor.");
    if (!note) return;
    setPendingIntent("return");
    startTransition(async () => {
      const res = await returnForChanges(post.id!, note);
      setResult(res);
      setPendingIntent(null);
      if (res.ok) {
        const next = { ...post, reviewRequestedAt: null, reviewNote: note.trim(), updatedAt: res.updatedAt ?? post.updatedAt };
        setPost(next);
        setSaved(next);
        router.refresh();
      }
    });
  };

  const remove = () => {
    if (!post.id || !window.confirm(`Delete “${post.title || "Untitled"}”? This can’t be undone.`)) return;
    setPendingIntent("delete");
    startTransition(async () => {
      const res = await deletePost(post.id!);
      if (res.ok) {
        setSaved(post); // don't trigger the unsaved-changes prompt
        router.push("/admin/posts");
      } else {
        setResult({ ok: false, message: res.message });
        setPendingIntent(null);
      }
    });
  };

  // ⌘S / Ctrl+S saves; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!locked) run("save");
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, locked, run]);

  const openPreview = () => {
    if (!post.id) return;
    window.open(`/admin/preview/${post.id}`, "_blank", "noopener");
  };

  const toggleTag = (id: string) =>
    update("tagIds", post.tagIds.includes(id) ? post.tagIds.filter((t) => t !== id) : [...post.tagIds, id]);

  const searchTitle = `${post.seoTitle || post.title || "Untitled"} | ${siteConfig.name}`;
  const searchDescription = post.seoDescription || post.excerpt || "Add an excerpt or meta description.";
  const host = siteConfig.url.replace(/^https?:\/\//, "");

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.topbar}>
          <Link href="/admin/posts" className={ui.buttonGhost}>
            ← Posts
          </Link>
          <span className={`${ui.muted} ${styles.saveState}`} aria-live="polite">
            {pending ? "Saving…" : dirty ? "Unsaved changes" : post.id ? "All changes saved" : "New post"}
          </span>
        </div>

        {result && (
          <p role={result.ok ? "status" : "alert"} className={`${ui.notice} ${result.ok ? ui.noticeOk : ui.noticeError} ${styles.banner}`}>
            {result.message}
          </p>
        )}

        <label className="sr-only" htmlFor="post-title">
          Title
        </label>
        <textarea
          id="post-title"
          className={styles.titleInput}
          value={post.title}
          rows={1}
          placeholder="Post title"
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => update("title", e.target.value.replace(/\n/g, ""))}
        />
        {errors.title && <FieldError>{errors.title}</FieldError>}

        <RichTextEditor
          initialHtml={initial.content}
          onChange={(html) => update("content", html)}
          invalid={Boolean(errors.content)}
          pickImage={() => pickImage("Insert an image")}
        />
        {errors.content && <FieldError>{errors.content}</FieldError>}
      </div>

      <aside className={styles.sidebar} aria-label="Post settings">
        <Panel title="Publish">
          <div className={styles.statusRow}>
            <span className={`${ui.badge} ${isLive ? ui.badgePublished : isScheduled || inReview ? ui.badgeScheduled : ui.badgeDraft}`}>
              {isLive ? "published" : isScheduled ? "scheduled" : inReview ? "in review" : "draft"}
            </span>
            {post.publishedAt && post.status !== "draft" && <span className={ui.muted}>{formatWhen(post.publishedAt)}</span>}
          </div>
          {post.reviewNote && !inReview && !isLive && (
            <p className={`${ui.notice} ${ui.noticeError}`}>
              <strong>Changes requested:</strong> {post.reviewNote}
            </p>
          )}
          {inReview && (
            <p className={`${ui.notice} ${ui.muted}`}>
              {canReview
                ? "A contributor submitted this draft. Publish it, or send it back with a note."
                : `Submitted for review ${formatWhen(post.reviewRequestedAt!)}. You can edit it again if an editor sends it back.`}
            </p>
          )}
          <div className={styles.actions}>
            {!canReview ? (
              <>
                {!locked && (
                  <>
                    <button type="button" className={ui.button} disabled={pending} onClick={() => run("submit")}>
                      {pendingIntent === "submit" ? "Submitting…" : "Submit for review"}
                    </button>
                    <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => run("save")}>
                      {pendingIntent === "save" ? "Saving…" : "Save draft"}
                    </button>
                  </>
                )}
                <button type="button" className={ui.buttonGhost} disabled={!post.id || dirty} onClick={openPreview} title={dirty ? "Save first to preview" : undefined}>
                  Preview
                </button>
              </>
            ) : isLive ? (
              <>
                <button type="button" className={ui.button} disabled={pending} onClick={() => run("save")}>
                  {pendingIntent === "save" ? "Updating…" : "Update"}
                </button>
                <a href={`/posts/${saved.slug}`} target="_blank" rel="noreferrer" className={ui.buttonGhost}>
                  View live
                </a>
                <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => run("unpublish")}>
                  Unpublish
                </button>
              </>
            ) : (
              <>
                <button type="button" className={ui.button} disabled={pending} onClick={() => run("publish")}>
                  {pendingIntent === "publish" ? "Publishing…" : isScheduled ? "Publish now" : "Publish"}
                </button>
                <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => run("save")}>
                  {pendingIntent === "save" ? "Saving…" : isScheduled ? "Save" : "Save draft"}
                </button>
                <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => setShowSchedule((v) => !v)} aria-expanded={showSchedule}>
                  {isScheduled ? "Reschedule" : "Schedule…"}
                </button>
                <button type="button" className={ui.buttonGhost} disabled={!post.id || dirty} onClick={openPreview} title={dirty ? "Save first to preview" : undefined}>
                  Preview
                </button>
                {isScheduled && (
                  <button type="button" className={ui.buttonGhost} disabled={pending} onClick={() => run("unpublish")}>
                    Unschedule
                  </button>
                )}
                {inReview && (
                  <button type="button" className={ui.buttonGhost} disabled={pending} onClick={sendBack}>
                    {pendingIntent === "return" ? "Sending back…" : "Send back with note"}
                  </button>
                )}
              </>
            )}
          </div>
          {canReview && showSchedule && !isLive && (
            <div className={styles.schedule}>
              <label className={styles.label} htmlFor="post-publish-at">
                Publish on <span className={ui.muted}>(your local time)</span>
              </label>
              <div className={ui.inlineForm}>
                <input
                  id="post-publish-at"
                  type="datetime-local"
                  className={ui.input}
                  value={publishAt}
                  min={toLocalInput(new Date(now + 5 * 60_000).toISOString())}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
                <button type="button" className={ui.button} disabled={pending || !publishAt} onClick={() => run("schedule")}>
                  {pendingIntent === "schedule" ? "Scheduling…" : "Schedule"}
                </button>
              </div>
              {errors.publishAt && <FieldError>{errors.publishAt}</FieldError>}
              <p className={`${ui.muted} ${styles.hint}`}>The post goes live within about 10 minutes of this time.</p>
            </div>
          )}
          {isLive && <p className={`${ui.muted} ${styles.hint}`}>Updates go live immediately.</p>}
        </Panel>

        <Panel title="URL">
          <label className={styles.label} htmlFor="post-slug">
            Slug
          </label>
          <div className={styles.slugField}>
            <span className={ui.muted}>/posts/</span>
            <input
              id="post-slug"
              className={`${ui.input} ${styles.grow}`}
              value={post.slug}
              aria-invalid={Boolean(errors.slug)}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value.replace(/\s/g, "-")) + (e.target.value.endsWith("-") ? "-" : ""));
              }}
              onBlur={() => update("slug", slugify(post.slug))}
            />
          </div>
          {errors.slug && <FieldError>{errors.slug}</FieldError>}
          {isLive && saved.slug !== post.slug && (
            <p className={`${ui.notice} ${ui.noticeError}`}>Changing the URL of a live post breaks existing links.</p>
          )}
        </Panel>

        <Panel title="Excerpt">
          <textarea
            className={`${ui.input} ${styles.textarea}`}
            rows={4}
            value={post.excerpt}
            placeholder="One or two sentences shown on cards, in search results and social shares."
            aria-invalid={Boolean(errors.excerpt)}
            onChange={(e) => update("excerpt", e.target.value)}
          />
          <Counter value={post.excerpt} range={COUNTS.excerpt} />
          {errors.excerpt && <FieldError>{errors.excerpt}</FieldError>}
        </Panel>

        <Panel title="Tags">
          <div className={styles.tagList}>
            {tags.map((t) => {
              const index = post.tagIds.indexOf(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.tag} ${index >= 0 ? styles.tagOn : ""}`}
                  aria-pressed={index >= 0}
                  onClick={() => toggleTag(t.id)}
                >
                  {index === 0 && <span className={styles.primary}>Primary · </span>}
                  {t.name}
                </button>
              );
            })}
          </div>
          <p className={`${ui.muted} ${styles.hint}`}>The first selected tag is the post’s primary section.</p>
          {errors.tagIds && <FieldError>{errors.tagIds}</FieldError>}
        </Panel>

        {canReview ? (
          <Panel title="Details">
            <label className={styles.label} htmlFor="post-author">
              Author
            </label>
            <select id="post-author" className={`${ui.select} ${styles.full}`} value={post.authorId} onChange={(e) => update("authorId", e.target.value)}>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.authorId && <FieldError>{errors.authorId}</FieldError>}

            <label className={styles.checkbox}>
              <input type="checkbox" checked={post.featured} onChange={(e) => update("featured", e.target.checked)} />
              Feature on the home page
            </label>
          </Panel>
        ) : (
          <Panel title="Details">
            <p className={ui.muted}>Published under your byline: {authors.find((a) => a.id === post.authorId)?.name ?? "your profile"}.</p>
          </Panel>
        )}

        <Panel title="Cover image">
          {post.coverSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverSrc} alt="" className={styles.coverPreview} />
          )}
          <div className={styles.actions}>
            <button type="button" className={ui.buttonGhost} onClick={chooseCover}>
              {post.coverSrc ? "Replace image" : "Choose image"}
            </button>
            {post.coverSrc && (
              <button
                type="button"
                className={ui.buttonGhost}
                onClick={() => setPost((p) => ({ ...p, coverSrc: "", coverAlt: "", coverWidth: null, coverHeight: null }))}
              >
                Remove
              </button>
            )}
          </div>
          <label className={styles.label} htmlFor="post-cover">
            Image URL
          </label>
          <input
            id="post-cover"
            className={`${ui.input} ${styles.full}`}
            value={post.coverSrc}
            placeholder="Choose from the library, or paste https://…"
            aria-invalid={Boolean(errors.coverSrc)}
            onChange={(e) => setPost((p) => ({ ...p, coverSrc: e.target.value, coverWidth: null, coverHeight: null }))}
          />
          {errors.coverSrc && <FieldError>{errors.coverSrc}</FieldError>}
          <label className={styles.label} htmlFor="post-cover-alt">
            Alt text
          </label>
          <input
            id="post-cover-alt"
            className={`${ui.input} ${styles.full}`}
            value={post.coverAlt}
            placeholder="Describe the image"
            aria-invalid={Boolean(errors.coverAlt)}
            onChange={(e) => update("coverAlt", e.target.value)}
          />
          {errors.coverAlt && <FieldError>{errors.coverAlt}</FieldError>}
        </Panel>

        <Panel title="SEO">
          <label className={styles.label} htmlFor="post-keyword">
            Focus keyword
          </label>
          <input
            id="post-keyword"
            className={`${ui.input} ${styles.full}`}
            value={post.focusKeyword}
            placeholder="e.g. unity beginner guide"
            aria-invalid={Boolean(errors.focusKeyword)}
            onChange={(e) => update("focusKeyword", e.target.value)}
          />
          {errors.focusKeyword && <FieldError>{errors.focusKeyword}</FieldError>}

          <div className={`${styles.score} ${styles[`score_${score.tone}`]}`} role="status">
            SEO: {score.label}
          </div>
          <ul className={styles.checks} aria-label="SEO checklist">
            {seoChecks.map((c) => (
              <li key={c.id} className={styles[`check_${c.status}`]}>
                <span aria-hidden="true">{c.status === "good" ? "✓" : c.status === "warn" ? "!" : "✕"}</span>
                <div>
                  {c.label}
                  {c.tip && <p className={styles.checkTip}>{c.tip}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Search & social preview">
          <div className={styles.serp} aria-label="Google result preview">
            <span className={styles.serpUrl}>
              {host} › posts › {post.slug || "…"}
            </span>
            <span className={styles.serpTitle}>{truncate(searchTitle, 62)}</span>
            <span className={styles.serpDesc}>{truncate(searchDescription, 160)}</span>
          </div>
          <div className={styles.social} aria-label="Social share preview">
            {post.coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.coverSrc} alt="" />
            ) : (
              <div className={styles.socialPlaceholder}>Generated card</div>
            )}
            <div className={styles.socialText}>
              <span className={styles.socialHost}>{host.toUpperCase()}</span>
              <span className={styles.socialTitle}>{truncate(post.seoTitle || post.title || "Untitled", 70)}</span>
              <span className={styles.socialDesc}>{truncate(searchDescription, 100)}</span>
            </div>
          </div>
          <label className={styles.label} htmlFor="post-seo-title">
            SEO title <span className={ui.muted}>(optional)</span>
          </label>
          <input
            id="post-seo-title"
            className={`${ui.input} ${styles.full}`}
            value={post.seoTitle}
            placeholder={post.title}
            aria-invalid={Boolean(errors.seoTitle)}
            onChange={(e) => update("seoTitle", e.target.value)}
          />
          <Counter value={post.seoTitle || post.title} range={COUNTS.seoTitle} />
          {errors.seoTitle && <FieldError>{errors.seoTitle}</FieldError>}
          <label className={styles.label} htmlFor="post-seo-desc">
            Meta description <span className={ui.muted}>(optional)</span>
          </label>
          <textarea
            id="post-seo-desc"
            className={`${ui.input} ${styles.textarea}`}
            rows={3}
            value={post.seoDescription}
            placeholder={post.excerpt || "Defaults to the excerpt"}
            aria-invalid={Boolean(errors.seoDescription)}
            onChange={(e) => update("seoDescription", e.target.value)}
          />
          <Counter value={post.seoDescription || post.excerpt} range={COUNTS.seoDescription} />
          {errors.seoDescription && <FieldError>{errors.seoDescription}</FieldError>}
        </Panel>

        <Panel title="Advanced">
          <label className={styles.checkbox}>
            <input type="checkbox" checked={post.noindex} onChange={(e) => update("noindex", e.target.checked)} />
            Hide from search engines (noindex)
          </label>
          <label className={styles.label} htmlFor="post-canonical">
            Canonical URL <span className={ui.muted}>(only if first published elsewhere)</span>
          </label>
          <input
            id="post-canonical"
            className={`${ui.input} ${styles.full}`}
            value={post.canonicalUrl}
            placeholder="https://original-site.com/article"
            aria-invalid={Boolean(errors.canonicalUrl)}
            onChange={(e) => update("canonicalUrl", e.target.value)}
          />
          {errors.canonicalUrl && <FieldError>{errors.canonicalUrl}</FieldError>}
        </Panel>

        <MediaPicker open={Boolean(picker)} title={picker?.title} onSelect={(item) => closePicker(item)} onClose={() => closePicker(null)} />

        {post.id && canReview && (
          <button type="button" className={`${ui.buttonDanger} ${styles.delete}`} disabled={pending} onClick={remove}>
            {pendingIntent === "delete" ? "Deleting…" : "Delete post"}
          </button>
        )}
      </aside>
    </div>
  );
}

/** The editable fields sent to the server (and compared to detect unsaved changes). */
function toInput(p: EditorPost): PostInput {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    tagIds: p.tagIds,
    authorId: p.authorId,
    featured: p.featured,
    coverSrc: p.coverSrc,
    coverAlt: p.coverAlt,
    coverWidth: p.coverWidth,
    coverHeight: p.coverHeight,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    focusKeyword: p.focusKeyword,
    canonicalUrl: p.canonicalUrl,
    noindex: p.noindex,
  };
}

/** ISO → value for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2 className={ui.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className={`${ui.notice} ${ui.noticeError}`}>{children}</p>;
}

function Counter({ value, range: [min, max] }: { value: string; range: readonly [number, number] }) {
  const n = value.trim().length;
  const tone = n === 0 ? "" : n < min ? styles.countLow : n > max ? styles.countHigh : styles.countGood;
  return (
    <p className={`${styles.counter} ${tone}`}>
      {n} characters · aim for {min}–{max}
    </p>
  );
}
