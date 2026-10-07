import { STATUS_LABELS, statusMatchesFilter, isSubmissionStatus, type MyNewsFilter } from "@/lib/user-news/status-machine";
import type { MyNewsApiItem } from "@/features/user-news/api";
import type { UserNewsLocale } from "@/features/user-news/strings";

export type { MyNewsFilter };
export const FILTERS: MyNewsFilter[] = ["all", "published", "pending", "rejected", "draft"];

export function filterItems(items: MyNewsApiItem[], filter: MyNewsFilter): MyNewsApiItem[] {
  return items.filter((i) => isSubmissionStatus(i.status) && statusMatchesFilter(i.status, filter));
}

export function countByFilter(items: MyNewsApiItem[]): Record<MyNewsFilter, number> {
  return Object.fromEntries(FILTERS.map((f) => [f, filterItems(items, f).length])) as Record<MyNewsFilter, number>;
}

export function statusLabel(status: string, locale: UserNewsLocale): string {
  return isSubmissionStatus(status) ? STATUS_LABELS[status][locale] : status;
}

/** A story can be resumed or edited by its author only before it is handed to moderation (or after a moderator asked for changes). */
export function isResumable(status: string): boolean {
  return status === "draft" || status === "ai_generated" || status === "user_approved";
}

export function canWithdraw(status: string): boolean {
  return ["draft", "ai_generated", "user_approved", "submitted", "under_review", "approved", "published"].includes(status);
}

/** Engagement for a published story, or null (never a fake zero) when the story is not published. */
export function engagementView(item: MyNewsApiItem): { views: number; today: number; week: number; unique: number; likes: number; comments: number; rate: string } | null {
  if (item.status !== "published" || !item.stats) return null;
  const s = item.stats;
  return { views: s.viewsTotal, today: s.viewsToday, week: s.views7d, unique: s.uniqueViewers, likes: s.likes, comments: s.comments, rate: s.engagementRatePct === null ? "—" : `${s.engagementRatePct}%` };
}

export function sortNewestFirst(items: MyNewsApiItem[]): MyNewsApiItem[] {
  return [...items].sort((a, b) => (b.publishedAt ?? b.submittedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.submittedAt ?? a.createdAt));
}
