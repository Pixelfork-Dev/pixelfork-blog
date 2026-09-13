import Image from "next/image";
import Link from "next/link";
import { assetPath } from "@/config/site";
import { formatDate, formatReadingTime } from "@/lib/format";
import type { PostSummary } from "@/lib/types";
import { TagChips } from "./TagChips";
import styles from "./PostCard.module.css";

type Variant = "grid" | "hero" | "side";

interface PostCardProps {
  post: PostSummary;
  variant?: Variant;
  headingLevel?: "h2" | "h3";
  /** Set on above-the-fold cards so the LCP image is not lazy-loaded. */
  priority?: boolean;
}

const imageSizes: Record<Variant, string> = {
  hero: "(max-width: 1023px) calc(100vw - 80px), 540px",
  side: "(max-width: 767px) calc(100vw - 80px), 323px",
  grid: "(max-width: 767px) calc(100vw - 80px), (max-width: 1279px) 45vw, 377px",
};

export function PostCard({ post, variant = "grid", headingLevel: Heading = "h2", priority }: PostCardProps) {
  const href = `/posts/${post.slug}`;
  // The large featured card shows the title over the cover (soft gradient + tag pill), magazine style.
  const overlay = variant === "hero";
  const title = (
    <Heading className={styles.title}>
      <Link href={href} className={styles.link}>
        {post.title}
      </Link>
    </Heading>
  );

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.media}>
        <Image
          src={assetPath(post.cover.src)}
          alt={post.cover.alt}
          fill
          sizes={imageSizes[variant]}
          className={styles.image}
          priority={priority}
        />
        {overlay && (
          <div className={styles.overlay}>
            {post.tags[0] && <span className={styles.pill}>{post.tags[0].name}</span>}
            {title}
          </div>
        )}
      </div>
      <div className={styles.body}>
        {!overlay && title}
        <p className={styles.meta}>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {" · "}
          {formatReadingTime(post.readingTimeMinutes)}
        </p>
        <TagChips tags={post.tags.slice(0, 2)} className={styles.tags} />
      </div>
    </article>
  );
}
