"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { slugify } from "@/lib/slug";
import { createTag, deleteTag, moveTag, updateTag, type TagResult } from "./actions";
import ui from "../../admin.module.css";
import styles from "./tags.module.css";

export interface TagRowData {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

type Draft = { name: string; slug: string; description: string };

export function TagManager({ tags }: { tags: TagRowData[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [result, setResult] = useState<TagResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<TagResult>, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <>
      <section className={ui.section} aria-labelledby="new-tag">
        <h2 id="new-tag" className={ui.sectionTitle}>
          New tag
        </h2>
        <TagForm
          key={result?.ok ? result.message : "new"}
          submitLabel="Create tag"
          pending={pending}
          errors={editing === null && !result?.ok ? result?.fieldErrors : undefined}
          onSubmit={(draft) => run(() => createTag(draft))}
        />
      </section>

      <section className={ui.section} aria-labelledby="all-tags">
        <h2 id="all-tags" className={ui.sectionTitle}>
          All tags ({tags.length}) · order = public category bar
        </h2>
        {result && (
          <p role={result.ok ? "status" : "alert"} className={`${ui.notice} ${result.ok ? ui.noticeOk : ui.noticeError} ${styles.result}`}>
            {result.message}
          </p>
        )}
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Tag</th>
                <th>Description</th>
                <th>Posts</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, i) =>
                editing === tag.id ? (
                  <tr key={tag.id}>
                    <td colSpan={5}>
                      <TagForm
                        initial={tag}
                        submitLabel="Save"
                        pending={pending}
                        errors={!result?.ok ? result?.fieldErrors : undefined}
                        onCancel={() => {
                          setEditing(null);
                          setResult(null);
                        }}
                        onSubmit={(draft) => run(() => updateTag(tag.id, draft), () => setEditing(null))}
                        slugWarning={tag.postCount > 0}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={tag.id}>
                    <td className={ui.nowrap}>
                      <button type="button" className={styles.move} disabled={pending || i === 0} onClick={() => run(() => moveTag(tag.id, "up"))} aria-label={`Move ${tag.name} up`}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.move}
                        disabled={pending || i === tags.length - 1}
                        onClick={() => run(() => moveTag(tag.id, "down"))}
                        aria-label={`Move ${tag.name} down`}
                      >
                        ↓
                      </button>
                    </td>
                    <td>
                      <a href={`/tag/${tag.slug}`} target="_blank" rel="noreferrer" className={ui.link}>
                        {tag.name}
                      </a>
                      <div className={`${ui.muted} ${styles.slug}`}>/tag/{tag.slug}</div>
                    </td>
                    <td className={`${ui.muted} ${styles.description}`}>{tag.description || "—"}</td>
                    <td className={ui.muted}>{tag.postCount}</td>
                    <td className={ui.nowrap}>
                      <div className={ui.inlineForm}>
                        <button
                          type="button"
                          className={ui.buttonGhost}
                          onClick={() => {
                            setEditing(tag.id);
                            setResult(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={ui.buttonDanger}
                          disabled={pending}
                          onClick={() => {
                            const warn = tag.postCount
                              ? `Delete “${tag.name}”? It will be removed from ${tag.postCount} post${tag.postCount === 1 ? "" : "s"} and its tag page will disappear.`
                              : `Delete “${tag.name}”?`;
                            if (window.confirm(warn)) run(() => deleteTag(tag.id));
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {tags.length === 0 && <p className={ui.empty}>No tags yet.</p>}
        </div>
      </section>
    </>
  );
}

function TagForm({
  initial,
  submitLabel,
  pending,
  errors,
  onSubmit,
  onCancel,
  slugWarning,
}: {
  initial?: Draft;
  submitLabel: string;
  pending: boolean;
  errors?: TagResult["fieldErrors"];
  onSubmit: (draft: Draft) => void;
  onCancel?: () => void;
  slugWarning?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(initial ?? { name: "", slug: "", description: "" });
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const slugChanged = initial && draft.slug !== initial.slug;

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
    >
      <div className={styles.field}>
        <label htmlFor={`tag-name-${initial?.slug ?? "new"}`}>Name</label>
        <input
          id={`tag-name-${initial?.slug ?? "new"}`}
          className={ui.input}
          value={draft.name}
          maxLength={40}
          required
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) }))}
        />
        {errors?.name && <p className={`${ui.notice} ${ui.noticeError}`}>{errors.name}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor={`tag-slug-${initial?.slug ?? "new"}`}>Slug</label>
        <input
          id={`tag-slug-${initial?.slug ?? "new"}`}
          className={ui.input}
          value={draft.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }));
          }}
        />
        {errors?.slug && <p className={`${ui.notice} ${ui.noticeError}`}>{errors.slug}</p>}
        {slugWarning && slugChanged && <p className={`${ui.notice} ${ui.noticeError}`}>Changing the slug changes the tag page URL.</p>}
      </div>
      <div className={`${styles.field} ${styles.wide}`}>
        <label htmlFor={`tag-desc-${initial?.slug ?? "new"}`}>
          Description <span className={ui.muted}>(meta description of the tag page · {draft.description.length}/160)</span>
        </label>
        <input
          id={`tag-desc-${initial?.slug ?? "new"}`}
          className={ui.input}
          value={draft.description}
          maxLength={300}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
        {errors?.description && <p className={`${ui.notice} ${ui.noticeError}`}>{errors.description}</p>}
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={ui.button} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={ui.buttonGhost} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
