"use client";

import { useEffect, useRef } from "react";
import type { MediaItem } from "./actions";
import { MediaLibrary } from "./MediaLibrary";
import ui from "../../admin.module.css";
import styles from "./media.module.css";

interface Props {
  open: boolean;
  title?: string;
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}

/** Modal media library used by the post editor (cover image and in-article images). */
export function MediaPicker({ open, title = "Choose an image", onSelect, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={dialog} className={styles.dialog} onClose={onClose} aria-label={title}>
      <div className={styles.dialogHeader}>
        <h2 className={styles.dialogTitle}>{title}</h2>
        <button type="button" className={ui.buttonGhost} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.dialogBody}>{open && <MediaLibrary mode="picker" onSelect={onSelect} />}</div>
    </dialog>
  );
}
