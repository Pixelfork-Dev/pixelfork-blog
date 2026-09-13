import type { Metadata } from "next";
import Link from "next/link";
import { PageBand } from "@/components/PageBand";
import { PostGrid } from "@/components/PostGrid";
import { getAllPosts } from "@/lib/posts";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
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
