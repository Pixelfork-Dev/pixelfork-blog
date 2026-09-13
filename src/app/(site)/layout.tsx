import { JsonLd } from "@/components/JsonLd";
import { SiteChrome } from "@/components/SiteChrome";
import { websiteJsonLd } from "@/lib/seo";

/**
 * Pages are regenerated in the background at most every 10 minutes (and immediately when content is
 * published from the admin). The interval is what makes scheduled posts go live on time without a cron job.
 */
export const revalidate = 600;

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteChrome>
      <JsonLd data={websiteJsonLd()} />
      {children}
    </SiteChrome>
  );
}
