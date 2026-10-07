/**
 * Canonical PUBLIC eligibility -- the one definition of "may a reader see this story in a timeline".
 *
 * Every public feed (Latest, Live / TV, Home, district, category, language, search, RSS, playback queues) must go through
 * selectFeedRows (feed-selector.ts), which applies this gate first. Geography policy (feed kind / district) is applied after it.
 *
 * A row is public only if ALL hold:
 *   - editorial/workflow status is public (approved | published | live; never pending / rejected / archived)
 *   - published_at is a valid timestamp inside the canonical 30-day window (future skew beyond the tolerance is rejected)
 *   - it has a slug (when a slug field is present) and a headline that is not boilerplate / roundup / placeholder
 *
 * published_at is the ONLY event time: created_at is a row-insert timestamp and never substitutes for it.
 * Pure and deterministic: no I/O, no clock other than the `now` argument.
 */

import { isWithinCanonicalReaderWindow } from "@/lib/news/canonical-window";
import { isHeadlineFitForPublicFeed } from "@/lib/news/quality/headline-quality";
import { isPublicGeneratedArticle } from "@/lib/newsroom/publish-state";

export type PublicGateRow = {
  id: string;
  slug?: string | null;
  headline: string;
  published_at: string | null;
  editorial_status?: string | null;
  workflow_status?: string | null;
};

export const PUBLIC_REJECT_REASONS = [
  "not_public_status",
  "no_published_at",
  "outside_window",
  "missing_slug",
  "unfit_headline",
] as const;
export type PublicRejectReason = (typeof PUBLIC_REJECT_REASONS)[number];

export type PublicRowCheck = { eligible: true; reason: null } | { eligible: false; reason: PublicRejectReason };

export function checkPublicRow(row: PublicGateRow, now: Date = new Date()): PublicRowCheck {
  if (!isPublicGeneratedArticle(row)) {
    // isPublicGeneratedArticle also fails on a missing published_at; report that precisely.
    return { eligible: false, reason: row.published_at ? "not_public_status" : "no_published_at" };
  }
  if (!row.published_at) return { eligible: false, reason: "no_published_at" };
  if (!isWithinCanonicalReaderWindow(row.published_at, now)) return { eligible: false, reason: "outside_window" };
  if (row.slug !== undefined && !String(row.slug ?? "").trim()) return { eligible: false, reason: "missing_slug" };
  if (!isHeadlineFitForPublicFeed(row.headline)) return { eligible: false, reason: "unfit_headline" };
  return { eligible: true, reason: null };
}

/** First occurrence wins by id and by slug. Call on newest-first input so the newest representation is kept. */
export function dedupeRowsNewestWins<T extends { id: string; slug?: string | null }>(rows: readonly T[]): T[] {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const slug = r.slug ? String(r.slug).trim().toLowerCase() : "";
    if (ids.has(r.id) || (slug && slugs.has(slug))) continue;
    ids.add(r.id);
    if (slug) slugs.add(slug);
    out.push(r);
  }
  return out;
}

/** UTC calendar-day boundary helper for "today" metrics (used by admin analytics so every screen agrees). */
export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
