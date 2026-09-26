/**
 * Authoritative Canonical 30-Day Reader News Window.
 *
 * Core rule:
 * A published article is eligible for reader discovery, Live TV broadcast,
 * category filtering, district filtering, and related stories if and only if:
 *   published_at >= now - 30 days
 *
 * No downstream query, cache, API limit, or feed builder may silently reduce
 * this window to 24h / 48h / 7d.
 */

export const READER_NEWS_WINDOW_DAYS = 30;
export const READER_NEWS_WINDOW_MS = READER_NEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Maximum acceptable clock skew / future publishing threshold (2 hours)
export const MAX_FUTURE_PUBLISH_TOLERANCE_MS = 2 * 60 * 60 * 1000;

/**
 * Returns the exact Date object for the 30-day rolling cutoff.
 */
export function getCanonicalReaderCutoff(now = new Date()): Date {
  return new Date(now.getTime() - READER_NEWS_WINDOW_MS);
}

/**
 * Returns the ISO 8601 string for the 30-day rolling cutoff.
 */
export function getCanonicalReaderCutoffIso(now = new Date()): string {
  return getCanonicalReaderCutoff(now).toISOString();
}

/**
 * Single authoritative reader eligibility predicate:
 * published_at >= now - 30 days (with a 2-hour future clock-skew grace).
 */
export function isWithinCanonicalReaderWindow(
  publishedAt: string | Date | number | null | undefined,
  now = new Date()
): boolean {
  if (!publishedAt) return false;

  const pubTime =
    typeof publishedAt === "number"
      ? publishedAt
      : new Date(publishedAt).getTime();

  if (!Number.isFinite(pubTime)) return false;

  const nowMs = now.getTime();
  const cutoffMs = nowMs - READER_NEWS_WINDOW_MS;
  const maxFutureMs = nowMs + MAX_FUTURE_PUBLISH_TOLERANCE_MS;

  return pubTime >= cutoffMs && pubTime <= maxFutureMs;
}

export type ArchiveHealthBreakdown = {
  total: number;
  buckets: {
    "0_1_days": number;
    "2_3_days": number;
    "4_7_days": number;
    "8_14_days": number;
    "15_21_days": number;
    "22_30_days": number;
    "older_than_30_days": number;
  };
  oldestPublishedAt: string | null;
  newestPublishedAt: string | null;
  oldestAgeDays: number | null;
};

/**
 * Computes the 30-Day Archive Health Metrics across standard operational boundaries:
 * 0–1 days, 2–3 days, 4–7 days, 8–14 days, 15–21 days, 22–30 days.
 */
export function computeArchiveHealthBreakdown(
  articles: Array<{ published_at?: string | null; publishedAt?: string | null }>,
  now = new Date()
): ArchiveHealthBreakdown {
  const nowMs = now.getTime();

  const breakdown: ArchiveHealthBreakdown = {
    total: 0,
    buckets: {
      "0_1_days": 0,
      "2_3_days": 0,
      "4_7_days": 0,
      "8_14_days": 0,
      "15_21_days": 0,
      "22_30_days": 0,
      "older_than_30_days": 0,
    },
    oldestPublishedAt: null,
    newestPublishedAt: null,
    oldestAgeDays: null,
  };

  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const a of articles) {
    const dateVal = a.publishedAt || a.published_at;
    if (!dateVal) continue;
    const t = new Date(dateVal).getTime();
    if (!Number.isFinite(t)) continue;

    breakdown.total++;
    if (t < minTime) {
      minTime = t;
      breakdown.oldestPublishedAt = new Date(t).toISOString();
    }
    if (t > maxTime) {
      maxTime = t;
      breakdown.newestPublishedAt = new Date(t).toISOString();
    }

    const ageDays = (nowMs - t) / (24 * 60 * 60 * 1000);

    if (ageDays <= 1) breakdown.buckets["0_1_days"]++;
    else if (ageDays <= 3) breakdown.buckets["2_3_days"]++;
    else if (ageDays <= 7) breakdown.buckets["4_7_days"]++;
    else if (ageDays <= 14) breakdown.buckets["8_14_days"]++;
    else if (ageDays <= 21) breakdown.buckets["15_21_days"]++;
    else if (ageDays <= 30) breakdown.buckets["22_30_days"]++;
    else breakdown.buckets["older_than_30_days"]++;
  }

  if (Number.isFinite(minTime)) {
    breakdown.oldestAgeDays = parseFloat(((nowMs - minTime) / (24 * 60 * 60 * 1000)).toFixed(2));
  }

  return breakdown;
}
