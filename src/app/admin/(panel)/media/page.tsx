import type { Metadata } from "next";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { listMedia } from "./actions";
import { MediaLibrary } from "./MediaLibrary";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  const user = await requireUser();
  const items = await listMedia();

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Media</h1>
          <p className={ui.subtitle}>Images for covers and articles. Add alt text so they help accessibility and image search.</p>
        </div>
      </header>
      <section className={ui.section}>
        <MediaLibrary mode="page" initialItems={items} canDelete={hasRole(user, "editor")} />
      </section>
    </>
  );
}
