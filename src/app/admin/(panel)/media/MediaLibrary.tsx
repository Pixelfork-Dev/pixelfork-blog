"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { assetPath } from "@/config/site";
import { deleteMedia, listMedia, updateMediaAlt, type MediaItem } from "./actions";
import ui from "../../admin.module.css";
import styles from "./media.module.css";

interface Props {
  mode: "page" | "picker";
  /** Editors and admins; contributors can't delete images. */
  canDelete?: boolean;
  initialItems?: MediaItem[];
  onSelect?: (item: MediaItem) => void;
}

const formatBytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function MediaLibrary({ mode, initialItems, onSelect, canDelete = false }: Props) {
  const [items, setItems] = useState<MediaItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  // Unsaved alt text per image, so switching images never loses or leaks an edit.
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const alt = selected ? (altDrafts[selected.id] ?? selected.alt) : "";
  const setAlt = (value: string) => selected && setAltDrafts((d) => ({ ...d, [selected.id]: value }));

  // The picker loads lazily when opened.
  useEffect(() => {
    if (initialItems) return;
    listMedia().then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  }, [initialItems]);

  const search = (q: string) => {
    setQuery(q);
    startTransition(async () => setItems(await listMedia(q)));
  };

  const upload = async (files: FileList | File[]) => {
    setMessage(null);
    for (const file of Array.from(files)) {
      setUploads((u) => [...u, file.name]);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(assetPath("/api/admin/media"), { method: "POST", body });
        const json = await res.json();
        if (!res.ok) {
          setMessage({ ok: false, text: `${file.name}: ${json.error ?? "Upload failed."}` });
        } else {
          const item: MediaItem = { ...json.media, createdAt: json.media.createdAt };
          setItems((prev) => [item, ...prev]);
          setSelectedId(item.id);
        }
      } catch {
        setMessage({ ok: false, text: `${file.name}: upload failed. Check your connection.` });
      } finally {
        setUploads((u) => u.filter((n) => n !== file.name));
      }
    }
  };

  const saveAlt = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await updateMediaAlt(selected.id, alt);
      setMessage({ ok: res.ok, text: res.message });
      if (res.ok) setItems((prev) => prev.map((i) => (i.id === selected.id ? { ...i, alt: alt.trim() } : i)));
    });
  };

  const remove = () => {
    if (!selected || !window.confirm(`Delete ${selected.filename}? This can’t be undone.`)) return;
    startTransition(async () => {
      const res = await deleteMedia(selected.id);
      setMessage({ ok: res.ok, text: res.message });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== selected.id));
        setSelectedId(null);
      }
    });
  };

  const choose = () => {
    if (!selected || !onSelect) return;
    onSelect({ ...selected, alt: alt.trim() || selected.alt });
  };

  return (
    <div className={`${styles.library} ${mode === "picker" ? styles.picker : ""}`}>
      <div className={styles.browser}>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
          }}
        >
          <p>
            <strong>Drop images here</strong> or{" "}
            <button type="button" className={ui.link} onClick={() => fileInput.current?.click()}>
              browse
            </button>
          </p>
          <p className={ui.muted}>JPEG, PNG, WebP, GIF or AVIF · up to 4 MB · resized to 2400px and converted to WebP</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className={styles.searchRow}>
          <input
            type="search"
            className={ui.input}
            placeholder="Search by file name or alt text"
            value={query}
            onChange={(e) => search(e.target.value)}
            aria-label="Search media"
          />
          <span className={ui.muted}>{items.length} images</span>
        </div>

        {message && (
          <p role={message.ok ? "status" : "alert"} className={`${ui.notice} ${message.ok ? ui.noticeOk : ui.noticeError}`}>
            {message.text}
          </p>
        )}

        <ul className={styles.grid} aria-label="Images" aria-busy={loading || pending}>
          {uploads.map((name) => (
            <li key={`uploading-${name}`} className={`${styles.tile} ${styles.uploading}`}>
              <span>Uploading {name}…</span>
            </li>
          ))}
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`${styles.tile} ${item.id === selectedId ? styles.selected : ""}`}
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => mode === "picker" && onSelect?.(item)}
                aria-pressed={item.id === selectedId}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt} loading="lazy" />
                {!item.alt && <span className={styles.noAlt}>No alt text</span>}
              </button>
            </li>
          ))}
        </ul>
        {!loading && items.length === 0 && uploads.length === 0 && <p className={ui.empty}>No images yet. Upload your first one above.</p>}
        {loading && <p className={ui.empty}>Loading images…</p>}
      </div>

      <aside className={styles.details} aria-label="Image details">
        {selected ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt="" className={styles.preview} />
            <p className={`${ui.strong} ${styles.filename}`}>{selected.filename}</p>
            <p className={ui.muted}>
              {selected.width}×{selected.height} · {formatBytes(selected.size)} ·{" "}
              {new Date(selected.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>

            <label className={styles.label} htmlFor="media-alt">
              Alt text
            </label>
            <textarea
              id="media-alt"
              className={`${ui.input} ${styles.altInput}`}
              rows={3}
              value={alt}
              placeholder="Describe what’s in the image for screen readers and image search"
              onChange={(e) => setAlt(e.target.value)}
            />
            <div className={styles.detailActions}>
              {mode === "picker" && (
                <button type="button" className={ui.button} onClick={choose}>
                  Use this image
                </button>
              )}
              <button type="button" className={ui.buttonGhost} disabled={pending || alt.trim() === selected.alt} onClick={saveAlt}>
                Save alt text
              </button>
              {mode === "page" && (
                <button
                  type="button"
                  className={ui.buttonGhost}
                  onClick={() => {
                    navigator.clipboard?.writeText(new URL(selected.url, location.origin).href);
                    setMessage({ ok: true, text: "URL copied." });
                  }}
                >
                  Copy URL
                </button>
              )}
              {canDelete && (
                <button type="button" className={ui.buttonDanger} disabled={pending} onClick={remove}>
                  Delete
                </button>
              )}
            </div>
          </>
        ) : (
          <p className={ui.muted}>{mode === "picker" ? "Select an image, or upload a new one." : "Select an image to edit its alt text or delete it."}</p>
        )}
      </aside>
    </div>
  );
}
