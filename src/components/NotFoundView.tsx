import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { PageBand } from "./PageBand";
import { PostGrid } from "./PostGrid";
import styles from "./NotFoundView.module.css";

/** 404 body. Wrapped in the site chrome by whichever not-found boundary renders it. */
export async function NotFoundView() {
  const latest = (await getAllPosts()).slice(0, 3);

  return (
    <>
      <PageBand />
      <section className={`${styles.hero} dash-bottom`}>
        <div className={`container ${styles.inner}`}>
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>This page doesn’t exist</h1>
          <p className={styles.text}>The article may have moved. Try one of the latest posts below.</p>
          <Link href="/" className={styles.button}>
            Back to the blog
          </Link>
        </div>
      </section>
      <PostGrid posts={latest} />
    </>
  );
}
