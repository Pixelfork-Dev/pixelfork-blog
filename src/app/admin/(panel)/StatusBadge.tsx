import ui from "../admin.module.css";

const CLASS: Record<string, string> = {
  published: ui.badgePublished,
  scheduled: ui.badgeScheduled,
  draft: ui.badgeDraft,
};

export function StatusBadge({ status, publishedAt }: { status: string; publishedAt: Date | null }) {
  // A scheduled post whose time has passed is already live.
  const live = status === "scheduled" && publishedAt && publishedAt <= new Date();
  const shown = live ? "published" : status;
  return <span className={`${ui.badge} ${CLASS[shown] ?? ""}`}>{shown}</span>;
}
