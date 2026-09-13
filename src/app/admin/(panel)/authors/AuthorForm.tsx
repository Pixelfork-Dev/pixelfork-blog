"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { slugify } from "@/lib/slug";
import { MediaPicker } from "../media/MediaPicker";
import { deleteAuthor, saveAuthor, type AuthorInput, type AuthorResult } from "./actions";
import ui from "../../admin.module.css";
import styles from "./authors.module.css";

interface Props {
  initial: AuthorInput;
  isOwnProfile: boolean;
  linkedEmail: string | null;
  postCount: number;
  googleImage: string | null;
}

export function AuthorForm({ initial, isOwnProfile, linkedEmail, postCount, googleImage }: Props) {
  const router = useRouter();
  const [author, setAuthor] = useState<AuthorInput>({ ...initial, sameAs: initial.sameAs.length ? initial.sameAs : [""] });
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [result, setResult] = useState<AuthorResult | null>(null);
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();
  const errors = result?.fieldErrors ?? {};

  const set = <K extends keyof AuthorInput>(key: K, value: AuthorInput[K]) =>
    setAuthor((a) => ({ ...a, [key]: value, ...(key === "name" && !slugTouched ? { slug: slugify(String(value)) } : {}) }));

  const save = () =>
    startTransition(async () => {
      const res = await saveAuthor(author);
      setResult(res);
      if (res.ok && res.id) {
        if (!author.id) router.replace(`/admin/authors/${res.id}`);
        else router.refresh();
        setSlugTouched(true);
      }
    });

  const remove = () => {
    if (!author.id || !window.confirm(`Delete ${author.name}?`)) return;
    startTransition(async () => {
      const res = await deleteAuthor(author.id!);
      if (res.ok) router.push("/admin/authors");
      else setResult(res);
    });
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`${ui.notice} ${result.ok ? ui.noticeOk : ui.noticeError}`}>
          {result.message}
        </p>
      )}

      <div className={styles.avatarRow}>
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatarUrl} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
        ) : (
          <span className={styles.avatarFallback}>{(author.name || "?").slice(0, 1)}</span>
        )}
        <div className={ui.inlineForm}>
          <button type="button" className={ui.buttonGhost} onClick={() => setPicking(true)}>
            {author.avatarUrl ? "Change photo" : "Choose photo"}
          </button>
          {googleImage && author.avatarUrl !== googleImage && (
            <button type="button" className={ui.buttonGhost} onClick={() => set("avatarUrl", googleImage)}>
              Use Google photo
            </button>
          )}
          {author.avatarUrl && (
            <button type="button" className={ui.buttonGhost} onClick={() => set("avatarUrl", "")}>
              Remove
            </button>
          )}
        </div>
        {errors.avatarUrl && <p className={`${ui.notice} ${ui.noticeError}`}>{errors.avatarUrl}</p>}
      </div>

      <div className={styles.grid}>
        <Field label="Display name" error={errors.name}>
          <input className={ui.input} value={author.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Job title" hint="e.g. Game Designer at Pixelfork" error={errors.jobTitle}>
          <input className={ui.input} value={author.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} maxLength={80} />
        </Field>
        <Field label="Profile URL" error={errors.slug} hint={postCount > 0 && initial.slug !== author.slug ? "Changing this changes the public author page URL." : undefined}>
          <div className={styles.slug}>
            <span className={ui.muted}>/authors/</span>
            <input
              className={ui.input}
              value={author.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
            />
          </div>
        </Field>
        <Field label="Website" error={errors.websiteUrl}>
          <input className={ui.input} value={author.websiteUrl} placeholder="https://" onChange={(e) => set("websiteUrl", e.target.value)} />
        </Field>
      </div>

      <Field label={`Bio (${author.bio.length}/500)`} hint="A short, factual bio shown on articles and the author page. It helps readers and search engines trust the author." error={errors.bio}>
        <textarea className={`${ui.input} ${styles.bio}`} rows={4} value={author.bio} maxLength={500} onChange={(e) => set("bio", e.target.value)} />
      </Field>

      <Field label="Profile links" hint="X, LinkedIn, GitHub, YouTube, itch.io… (https://)" error={errors.sameAs}>
        <div className={styles.links}>
          {author.sameAs.map((url, i) => (
            <div key={i} className={ui.inlineForm}>
              <input
                className={`${ui.input} ${styles.linkInput}`}
                value={url}
                placeholder="https://linkedin.com/in/…"
                onChange={(e) => set("sameAs", author.sameAs.map((u, j) => (j === i ? e.target.value : u)))}
              />
              <button type="button" className={ui.buttonGhost} onClick={() => set("sameAs", author.sameAs.filter((_, j) => j !== i))} aria-label="Remove link">
                ✕
              </button>
            </div>
          ))}
          {author.sameAs.length < 6 && (
            <button type="button" className={ui.buttonGhost} onClick={() => set("sameAs", [...author.sameAs, ""])}>
              Add link
            </button>
          )}
        </div>
      </Field>

      <div className={styles.footer}>
        <button type="submit" className={ui.button} disabled={pending}>
          {pending ? "Saving…" : author.id ? "Save profile" : "Create author"}
        </button>
        {author.id && postCount > 0 && (
          <a href={`/authors/${initial.slug}`} target="_blank" rel="noreferrer" className={ui.buttonGhost}>
            View public page
          </a>
        )}
        <Link href="/admin/authors" className={ui.buttonGhost}>
          Back to authors
        </Link>
        {author.id && !linkedEmail && postCount === 0 && (
          <button type="button" className={`${ui.buttonDanger} ${styles.delete}`} disabled={pending} onClick={remove}>
            Delete author
          </button>
        )}
      </div>
      {linkedEmail && (
        <p className={ui.muted}>
          {isOwnProfile ? "This is your byline" : `Byline of ${linkedEmail}`} · {postCount} post{postCount === 1 ? "" : "s"}
        </p>
      )}

      <MediaPicker
        open={picking}
        title="Choose a profile photo"
        onClose={() => setPicking(false)}
        onSelect={(item) => {
          set("avatarUrl", item.url);
          setPicking(false);
        }}
      />
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className={`${ui.muted} ${styles.hint}`}>{hint}</span>}
      {error && <span className={`${ui.notice} ${ui.noticeError}`}>{error}</span>}
    </label>
  );
}
