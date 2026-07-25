/**
 * Local Pulse composition — trending local + optional weather.
 * Never fabricates utility/traffic/power data.
 */

import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import {
  articleMatchesDistrict,
  isStatewideHomeArticle,
} from "@/lib/district-intelligence/match";
import { getDistrict } from "@/lib/regional/districts";
import { getNearbyDistricts } from "@/lib/district-intelligence/geo";

export type LocalPulseStory = {
  slug: string;
  headline: string;
  publishedAt?: string;
  kind: "breaking" | "trending" | "district" | "nearby";
};

export type LocalPulseModel = {
  districtSlug: string;
  districtNameHi: string;
  districtNameEn: string;
  weatherTempC?: number | null;
  weatherLabel?: string | null;
  nowStories: LocalPulseStory[];
  todayStories: LocalPulseStory[];
  trendingStories: LocalPulseStory[];
  nearbyStories: LocalPulseStory[];
  stateStories: LocalPulseStory[];
};

function toPulse(
  a: HomeArticle,
  kind: LocalPulseStory["kind"]
): LocalPulseStory {
  return {
    slug: a.slug,
    headline: a.headline,
    publishedAt: a.publishedAt,
    kind,
  };
}

export function buildLocalPulse(
  feed: GeneratedHomepageFeed,
  opts: {
    districtSlug: string;
    weatherTempC?: number | null;
    weatherLabel?: string | null;
    limit?: number;
  }
): LocalPulseModel | null {
  const districtSlug = opts.districtSlug.trim().toLowerCase();
  const district = getDistrict(districtSlug);
  if (!district) return null;

  const limit = opts.limit ?? 4;
  const pool = [
    ...(feed.breakingTicker ?? []),
    ...(feed.regionalHighlights ?? []),
    ...(feed.trending ?? []),
    ...(feed.liveWire ?? []),
    feed.editorsPicks?.lead,
    ...(feed.editorsPicks?.supporting ?? []),
  ].filter((a): a is HomeArticle => Boolean(a?.slug && a.headline?.trim()));

  // Promote local breaking alert headlines when they match a pool slug
  const alertSlugs = new Set(
    (feed.localBreakingAlerts ?? [])
      .map((a) => a.slug)
      .filter(Boolean)
  );

  const seen = new Set<string>();
  const take = (
    predicate: (a: HomeArticle) => boolean,
    kind: LocalPulseStory["kind"],
    n: number
  ): LocalPulseStory[] => {
    const out: LocalPulseStory[] = [];
    for (const a of pool) {
      if (seen.has(a.slug) || !predicate(a)) continue;
      seen.add(a.slug);
      out.push(toPulse(a, kind));
      if (out.length >= n) break;
    }
    return out;
  };

  const nearbySlugs = new Set(
    getNearbyDistricts(districtSlug, { maxCount: 5 }).map((d) => d.slug)
  );

  const nowStories = take(
    (a) =>
      articleMatchesDistrict(a, districtSlug) &&
      (alertSlugs.has(a.slug) ||
        a.ranking?.isBreaking ||
        a.urgency === "high" ||
        a.isLive),
    "breaking",
    3
  );

  const todayStories = take(
    (a) => articleMatchesDistrict(a, districtSlug),
    "district",
    limit
  );

  const trendingStories = take(
    (a) =>
      articleMatchesDistrict(a, districtSlug) &&
      (a.ranking?.isTrending || (a.priorityScore ?? 0) > 40),
    "trending",
    limit
  );

  const nearbyStories = take(
    (a) => {
      const slug = a.section === "raipur" ? "raipur" : null;
      // Prefer geo match via district helpers when available
      if (articleMatchesDistrict(a, districtSlug)) return false;
      for (const n of nearbySlugs) {
        if (articleMatchesDistrict(a, n)) return true;
      }
      return slug != null && nearbySlugs.has(slug);
    },
    "nearby",
    3
  );

  const stateStories = take(
    (a) => isStatewideHomeArticle(a) && !articleMatchesDistrict(a, districtSlug),
    "district",
    limit
  );

  const hasContent =
    nowStories.length +
      todayStories.length +
      trendingStories.length +
      nearbyStories.length >
    0;
  if (!hasContent) return null;

  return {
    districtSlug,
    districtNameHi: district.nameHi,
    districtNameEn: district.name,
    weatherTempC: opts.weatherTempC ?? null,
    weatherLabel: opts.weatherLabel ?? null,
    nowStories,
    todayStories,
    trendingStories,
    nearbyStories,
    stateStories,
  };
}
