import type { PostSummary } from "@/lib/types";
import { PostCard } from "./PostCard";
import styles from "./FeaturedPosts.module.css";

export function FeaturedPosts({ posts }: { posts: PostSummary[] }) {
  const [hero, ...side] = posts;
  if (!hero) return null;

  return (
    <section aria-labelledby="featured-heading" className="dash-bottom">
      <h2 id="featured-heading" className="sr-only">
        Featured articles
      </h2>
      <div className={`container ${styles.layout}`}>
        <div className={styles.hero} data-runner-perch="full">
          <PostCard post={hero} variant="hero" headingLevel="h3" priority />
        </div>
        {side.length > 0 && (
          <div className={styles.side}>
            {side.map((post, i) => (
              // The first side card sits on the band line; the second on a line only the right rail reaches.
              <div key={post.slug} className={styles.sideItem} data-runner-perch={i === 0 ? "full" : "right"}>
                <PostCard post={post} variant="side" headingLevel="h3" priority />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
