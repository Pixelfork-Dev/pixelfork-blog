import ui from "../admin.module.css";

const CLASS: Record<string, string> = {
  published: ui.badgePublished,
  scheduled: ui.badgeScheduled,
  draft: ui.badgeDraft,
};

export function StatusBadge({ status, publishedAt, inReview = false }: { status: string; publishedAt: Date | null; inReview?: boolean }) {
  // A scheduled post whose time has passed is already live.
  const live = status === "scheduled" && publishedAt && publishedAt <= new Date();
  if (status === "draft" && inReview) return <span className={`${ui.badge} ${ui.badgeScheduled}`}>in review</span>;
  const shown = live ? "published" : status;
  return <span className={`${ui.badge} ${CLASS[shown] ?? ""}`}>{shown}</span>;
}
