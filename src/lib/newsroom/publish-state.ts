/**
 * Shared publish gates for generated_articles — generation, homepage, backfill.
 */

import type { EditorialArticleStatus } from "@/lib/editorial-dashboard/types";

export const PUBLIC_EDITORIAL_STATUSES = [
  "approved",
  "published",
  "live",
] as const;

export type PublicEditorialStatus = (typeof PUBLIC_EDITORIAL_STATUSES)[number];

export function isNewsroomAutoPublishEnabled(): boolean {
  return process.env.NEWSROOM_AUTO_PUBLISH === "true";
}

/** Fields applied when an article is publicly visible on the homepage. */
export function buildPublicPublishPatch(now = new Date()): {
  editorial_status: EditorialArticleStatus;
  published_at: string;
  workflow_status: "published";
  reviewed_at: string;
} {
  const iso = now.toISOString();
  return {
    editorial_status: "approved",
    published_at: iso,
    workflow_status: "published",
    reviewed_at: iso,
  };
}

/** Whether a generated_articles row should appear in the public homepage pool. */
export function isPublicGeneratedArticle(row: {
  editorial_status?: string | null;
  published_at?: string | null;
  workflow_status?: string | null;
}): boolean {
  const status = (row.editorial_status ?? "approved") as EditorialArticleStatus;
  if (status === "rejected" || status === "pending") return false;
  if (!row.published_at) return false;
  if (!PUBLIC_EDITORIAL_STATUSES.includes(status as PublicEditorialStatus)) return false;
  return true;
}
