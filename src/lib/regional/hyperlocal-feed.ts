/**
 * Hyperlocal feeds — district-based routing and feed blocks
 */

import { formatDistrictLabel, scoreRegionalTopicFromArticle } from "@/lib/regional/topic-scoring";
import { geoFromRecord } from "@/lib/regional/geo-tagging";
import {
  getDistrict,
  getPrioritizedDistricts,
  type CgDistrict,
} from "@/lib/regional/districts";
import { detectLocalTrends } from "@/lib/regional/trends";
import { buildLocalBreakingAlerts } from "@/lib/regional/breaking-alerts";
import { logRegionalAnalytics } from "@/lib/regional/analytics";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type HyperlocalArticleRef = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  district: string | null;
  regionalScore: number;
  publishedAt: string;
};

export type HyperlocalFeedBlock = {
  districtSlug: string;
  districtName: string;
  districtNameHi: string;
  priority: number;
  articles: HyperlocalArticleRef[];
  trendVelocity: number;
};

export type HyperlocalFeedBundle = {
  stateSlug: string;
  feeds: HyperlocalFeedBlock[];
  localTrends: ReturnType<typeof detectLocalTrends>;
  breakingAlerts: ReturnType<typeof buildLocalBreakingAlerts>;
  routedAt: string;
};

function toRef(
  row: GeneratedArticleRow,
  homeDistrict?: string | null
): HyperlocalArticleRef {
  const geo = geoFromRecord(row);
  const topic = scoreRegionalTopicFromArticle(row, homeDistrict);
  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    summary: row.summary?.trim() ?? "",
    district: geo.primary_district,
    regionalScore: topic.score,
    publishedAt: row.published_at ?? row.created_at,
  };
}

export function routeArticlesByDistrict(
  rows: GeneratedArticleRow[]
): Map<string, GeneratedArticleRow[]> {
  const byDistrict = new Map<string, GeneratedArticleRow[]>();

  for (const row of rows) {
    const geo = geoFromRecord(row);
    if (!geo.is_chhattisgarh && !geo.districts.length) continue;

    const targets =
      geo.districts.length > 0 ? geo.districts : ["statewide"];

    for (const slug of targets) {
      const list = byDistrict.get(slug) ?? [];
      list.push(row);
      byDistrict.set(slug, list);
    }
  }

  return byDistrict;
}

export function buildHyperlocalFeedBundle(
  rows: GeneratedArticleRow[],
  options?: {
    homeDistrict?: string | null;
    maxDistricts?: number;
    perDistrict?: number;
  }
): HyperlocalFeedBundle {
  const maxDistricts = options?.maxDistricts ?? 8;
  const perDistrict = options?.perDistrict ?? 6;
  const routed = routeArticlesByDistrict(rows);
  const order = getPrioritizedDistricts();

  const feeds: HyperlocalFeedBlock[] = [];

  const districtOrder = [
    ...(options?.homeDistrict ? [options.homeDistrict] : []),
    ...order.map((d) => d.slug),
    "statewide",
  ];

  const seen = new Set<string>();

  for (const slug of districtOrder) {
    if (seen.has(slug) || feeds.length >= maxDistricts) continue;
    const pool = routed.get(slug);
    if (!pool?.length) continue;
    seen.add(slug);

    const district: CgDistrict | undefined = getDistrict(slug);
    const sorted = [...pool].sort((a, b) => {
      const sa = scoreRegionalTopicFromArticle(a, options?.homeDistrict).score;
      const sb = scoreRegionalTopicFromArticle(b, options?.homeDistrict).score;
      return sb - sa;
    });

    const articles = sorted
      .slice(0, perDistrict)
      .map((r) => toRef(r, options?.homeDistrict));

    const labels = formatDistrictLabel(slug);

    feeds.push({
      districtSlug: slug,
      districtName: slug === "statewide" ? "Chhattisgarh" : labels.en,
      districtNameHi: slug === "statewide" ? "छत्तीसगढ़" : labels.hi,
      priority: district?.priority ?? 3,
      articles,
      trendVelocity: articles.length,
    });
  }

  const localTrends = detectLocalTrends(rows);
  const breakingAlerts = buildLocalBreakingAlerts(rows, {
    homeDistrict: options?.homeDistrict,
    cgOnly: true,
  });

  const bundle: HyperlocalFeedBundle = {
    stateSlug: "chhattisgarh",
    feeds,
    localTrends,
    breakingAlerts,
    routedAt: new Date().toISOString(),
  };

  logRegionalAnalytics({
    event: "hyperlocal_feed_built",
    districtCount: feeds.length,
    articleCount: feeds.reduce((s, f) => s + f.articles.length, 0),
    breakingCount: breakingAlerts.length,
    trendCount: localTrends.length,
    homeDistrict: options?.homeDistrict ?? null,
  });

  return bundle;
}

export function filterRowsForDistrict(
  rows: GeneratedArticleRow[],
  districtSlug: string
): GeneratedArticleRow[] {
  if (districtSlug === "chhattisgarh" || districtSlug === "statewide") {
    return rows.filter((r) => geoFromRecord(r).is_chhattisgarh);
  }

  return rows.filter((r) => {
    const geo = geoFromRecord(r);
    return (
      geo.districts.includes(districtSlug) ||
      geo.primary_district === districtSlug
    );
  });
}
