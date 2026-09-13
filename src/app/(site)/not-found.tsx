import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** 404 inside the public site: the (site) layout already renders the header and footer. */
export default function SiteNotFound() {
  return <NotFoundView />;
}
