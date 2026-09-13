import type { PostSummary } from "@/lib/types";
import { PostCard } from "./PostCard";
import styles from "./PostGrid.module.css";

interface PostGridProps {
  posts: PostSummary[];
  headingLevel?: "h2" | "h3";
  /** Number of leading cards whose images load eagerly (above the fold). */
  priorityCount?: number;
  label?: string;
}

export function PostGrid({ posts, headingLevel = "h2", priorityCount = 0, label }: PostGridProps) {
  return (
    <div className="container">
      <ul className={styles.grid} aria-label={label}>
        {posts.map((post, i) => (
          <li key={post.slug} className={styles.cell}>
            <PostCard post={post} headingLevel={headingLevel} priority={i < priorityCount} />
          </li>
        ))}
      </ul>
    </div>
  );
}
