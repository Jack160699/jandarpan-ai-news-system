/**
 * आज का दर्पण — district-aware daily briefing from existing homepage feed.
 * No AI at request time. Breaking stories can override ranking.
 */

import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { articleMatchesDistrict } from "@/lib/district-intelligence/match";
import { getDistrict } from "@/lib/regional/districts";
import {
  getDayPartCopy,
  kolkataDateKey,
  type DayPart,
  type DayPartCopy,
} from "./time-of-day";

export const DAILY_DARPAN_LIMIT = 7;

export type DailyDarpanItem = {
  rank: number;
  slug: string;
  id: string;
  headline: string;
  summary?: string;
  publishedAt?: string;
  isBreaking: boolean;
  districtBoosted: boolean;
};

export type DailyDarpanBriefing = {
  dateKey: string;
  dayPart: DayPart;
  copy: DayPartCopy;
  districtSlug: string;
  districtLabelHi: string;
  districtLabelEn: string;
  weekdayHi: string;
  weekdayEn: string;
  items: DailyDarpanItem[];
  listenHref: string;
};

function weekdayLabels(nowMs: number): { hi: string; en: string } {
  try {
    const hi = new Intl.DateTimeFormat("hi-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
    }).format(new Date(nowMs));
    const en = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
    }).format(new Date(nowMs));
    return { hi, en };
  } catch {
    return { hi: "", en: "" };
  }
}

function scoreBriefingCandidate(
  article: HomeArticle,
  districtSlug: string,
  nowMs: number
): number {
  let score = article.priorityScore || article.trendScore || 0;
  if (article.ranking?.isBreaking || article.urgency === "high") score += 80;
  if (article.isLive) score += 40;
  if (article.ranking?.isTrending) score += 25;
  if (districtSlug && articleMatchesDistrict(article, districtSlug)) score += 55;

  const ageH =
    (nowMs - new Date(article.publishedAt || 0).getTime()) / 3_600_000;
  if (Number.isFinite(ageH)) {
    if (ageH < 6) score += 30;
    else if (ageH < 12) score += 18;
    else if (ageH < 24) score += 8;
    else if (ageH > 72) score -= 40;
  }

  // Prefer stories with a usable summary for briefing value
  if (article.summary?.trim() && article.summary.trim().length > 40) score += 6;
  return score;
}

function collectPool(feed: GeneratedHomepageFeed): HomeArticle[] {
  const out: HomeArticle[] = [];
  const seen = new Set<string>();
  const push = (a: HomeArticle | null | undefined) => {
    if (!a?.slug || !a.headline?.trim() || seen.has(a.slug)) return;
    seen.add(a.slug);
    out.push(a);
  };

  for (const a of feed.breakingTicker ?? []) push(a);
  push(feed.editorsPicks?.lead);
  for (const a of feed.editorsPicks?.supporting ?? []) push(a);
  for (const a of feed.regionalHighlights ?? []) push(a);
  for (const a of feed.trending ?? []) push(a);
  for (const a of feed.liveWire ?? []) push(a);
  return out;
}

/**
 * Build आज का दर्पण from feed. Suppresses empty/weak briefings (caller may hide).
 */
export function buildDailyDarpan(
  feed: GeneratedHomepageFeed,
  opts: {
    districtSlug?: string | null;
    nowMs?: number;
    limit?: number;
    excludeSlugs?: Set<string>;
  } = {}
): DailyDarpanBriefing | null {
  const nowMs = opts.nowMs ?? Date.now();
  const limit = opts.limit ?? DAILY_DARPAN_LIMIT;
  const districtSlug = (opts.districtSlug?.trim() || "raipur").toLowerCase();
  const district = getDistrict(districtSlug);
  const copy = getDayPartCopy(nowMs);
  const weekdays = weekdayLabels(nowMs);
  const exclude = opts.excludeSlugs ?? new Set<string>();

  const ranked = collectPool(feed)
    .filter((a) => !exclude.has(a.slug))
    .map((a) => ({
      article: a,
      score: scoreBriefingCandidate(a, districtSlug, nowMs),
    }))
    .sort((a, b) => b.score - a.score);

  // Breaking override: ensure top breaking lands in top 3 when present
  const breaking = ranked.filter(
    (r) => r.article.ranking?.isBreaking || r.article.urgency === "high"
  );
  const ordered: typeof ranked = [];
  const used = new Set<string>();
  for (const b of breaking.slice(0, 2)) {
    ordered.push(b);
    used.add(b.article.slug);
  }
  for (const r of ranked) {
    if (used.has(r.article.slug)) continue;
    ordered.push(r);
    used.add(r.article.slug);
    if (ordered.length >= limit) break;
  }

  const items: DailyDarpanItem[] = ordered.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    slug: r.article.slug,
    id: r.article.id,
    headline: r.article.headline,
    summary: r.article.summary,
    publishedAt: r.article.publishedAt,
    isBreaking: Boolean(
      r.article.ranking?.isBreaking || r.article.urgency === "high"
    ),
    districtBoosted: articleMatchesDistrict(r.article, districtSlug),
  }));

  if (items.length < 3) return null;

  return {
    dateKey: kolkataDateKey(nowMs),
    dayPart: copy.dayPart,
    copy,
    districtSlug,
    districtLabelHi: district?.nameHi ?? districtSlug,
    districtLabelEn: district?.name ?? districtSlug,
    weekdayHi: weekdays.hi,
    weekdayEn: weekdays.en,
    items,
    listenHref: "/listen",
  };
}
