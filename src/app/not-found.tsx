import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** 404 outside the public site's layout (e.g. unknown /admin URLs): brings its own chrome. */
export default function RootNotFound() {
  return (
    <SiteChrome>
      <NotFoundView />
    </SiteChrome>
  );
}
