import { CopyLinkButton } from "./CopyLinkButton";
import styles from "./ShareLinks.module.css";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { label: "X", href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
  ];

  return (
    <div className={styles.share}>
      <h2 className={styles.heading}>Share</h2>
      <ul className={styles.list}>
        {targets.map((s) => (
          <li key={s.label}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={styles.chip}
              aria-label={`Share on ${s.label}`}
            >
              {s.label}
            </a>
          </li>
        ))}
        <li>
          <CopyLinkButton url={url} className={styles.chip} />
        </li>
      </ul>
    </div>
  );
}
