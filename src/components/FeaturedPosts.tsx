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
        <div className={styles.hero}>
          <PostCard post={hero} variant="hero" headingLevel="h3" priority />
        </div>
        {side.length > 0 && (
          <div className={styles.side}>
            {side.map((post) => (
              <div key={post.slug} className={styles.sideItem}>
                <PostCard post={post} variant="side" headingLevel="h3" priority />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
