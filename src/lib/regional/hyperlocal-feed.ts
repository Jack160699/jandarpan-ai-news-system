/**
 * Hyperlocal feeds — district-based routing and feed blocks
 */

import { formatDistrictLabel, scoreRegionalTopicFromArticle } from "@/lib/regional/topic-scoring";
import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { resolveRowGeo, selectFeedRows } from "@/lib/feed/feed-selector";
import { belongsToDistrictFeed } from "@/lib/news/geo/geo-scope";
import { comparePublishedDesc } from "@/lib/feed/freshness";
import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { resolveLocalizedFieldsStrict } from "@/lib/i18n/resolve-article";
import {
  getDistrict,
  getPrioritizedDistricts,
  type CgDistrict,
} from "@/lib/regional/districts";
import { detectLocalTrends } from "@/lib/regional/trends";
import { buildLocalBreakingAlerts } from "@/lib/regional/breaking-alerts";
import { logRegionalAnalytics } from "@/lib/regional/analytics";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { extractVerifiedRealMediaUrl } from "@/lib/news/images/validate";

export type HyperlocalArticleRef = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  district: string | null;
  regionalScore: number;
  publishedAt: string;
  imageUrl?: string;
  tags?: string[];
  canonicalCategories?: string[];
  primaryCategory?: string;
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
  homeDistrict?: string | null,
  displayLanguage: NewsroomLanguage = "hi"
): HyperlocalArticleRef | null {
  const localized = resolveLocalizedFieldsStrict(row, displayLanguage);
  if (!localized?.headline?.trim()) return null;

  const geo = geoFromRecord(row);
  const topic = scoreRegionalTopicFromArticle(row, homeDistrict);

  // Extract canonical image URL preserving verified news photography
  const verifiedUrl = extractVerifiedRealMediaUrl(row);
  const rawMeta = row.editorial_metadata as any;
  const rawImg =
    verifiedUrl ||
    row.hero_image_url ||
    rawMeta?.hero_image_url ||
    rawMeta?.image_url ||
    rawMeta?.imageUrl ||
    undefined;

  return {
    id: row.id,
    slug: row.slug,
    headline: localized.headline,
    summary: localized.summary?.trim() ?? "",
    district: geo.primary_district ?? null,
    regionalScore: topic.score,
    publishedAt: row.published_at ?? row.created_at ?? new Date().toISOString(),
    imageUrl: rawImg,
    tags: row.tags ?? [],
  };
}

/**
 * Routes rows into district buckets using STORED, evidence-based geography only (geo_metadata.scope written at publication).
 *   DISTRICT_SPECIFIC            -> each district it names
 *   STATEWIDE_CHHATTISGARH       -> "statewide"
 *   anything else / text-derived -> not routed (a district is never guessed from a headline, tag or source name)
 * Rows must also pass the canonical public gate (status, 30-day window, fit headline); output buckets are newest-first.
 */
export function routeArticlesByDistrict(
  rows: GeneratedArticleRow[]
): Map<string, GeneratedArticleRow[]> {
  const byDistrict = new Map<string, GeneratedArticleRow[]>();
  const gated = selectFeedRows(rows, { feed: "public_all", order: "chronological" }).rows;

  for (const row of gated) {
    const geo = resolveRowGeo(row);
    if (geo.derived) continue;

    let targets: string[] = [];
    if (geo.scope === "DISTRICT_SPECIFIC") {
      targets = geo.districts.length > 0 ? geo.districts : geo.districtSlug ? [geo.districtSlug] : [];
    } else if (geo.scope === "STATEWIDE_CHHATTISGARH") {
      targets = ["statewide"];
    }

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
    displayLanguage?: NewsroomLanguage;
  }
): HyperlocalFeedBundle {
  const maxDistricts = options?.maxDistricts ?? 8;
  const perDistrict = options?.perDistrict ?? 6;
  const displayLanguage = normalizeArticleLanguage(
    options?.displayLanguage ?? "hi"
  );
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
    // Chronology is authoritative: a score may never lift an older story above a newer one. (regionalScore is still reported.)
    const sorted = [...pool].sort(comparePublishedDesc);

    const articles = sorted
      .slice(0, perDistrict)
      .map((r) => toRef(r, options?.homeDistrict, displayLanguage))
      .filter((r): r is HyperlocalArticleRef => r !== null);

    if (!articles.length) continue;

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

  return rows.filter((r) => rowMatchesDistrict(r, districtSlug));
}

/**
 * True only when the row's STORED, evidence-based geography names this district (scope DISTRICT_SPECIFIC).
 * Never matched from tags, headline/summary text, source name or a re-tag at read time -- those are guesses, and a wrong guess
 * puts another district's (or a national) story on this district's page.
 */
export function rowMatchesDistrict(
  row: GeneratedArticleRow,
  districtSlug: string
): boolean {
  if (!row || !districtSlug) return false;
  const target = getDistrict(districtSlug)?.slug ?? districtSlug.trim().toLowerCase();
  const geo = resolveRowGeo(row);
  if (geo.derived) return false;
  return belongsToDistrictFeed(geo, target);
}

export type DistrictHubPartition = {
  /** Exact / strongly associated district stories */
  primary: GeneratedArticleRow[];
  /** Nearby / statewide CG only when primary inventory is thin */
  fallback: GeneratedArticleRow[];
};

/**
 * Partition pool for My District:
 * 1) exact district (+ content retag)
 * 2) remaining Chhattisgarh as honest fallback (never mixed into primary)
 */
export function partitionDistrictHubRows(
  rows: GeneratedArticleRow[],
  districtSlug: string,
  options?: { minPrimary?: number; maxFallback?: number }
): DistrictHubPartition {
  const minPrimary = options?.minPrimary ?? 4;
  const maxFallback = options?.maxFallback ?? 12;

  const primary = prioritizePrimaryDistrict(
    filterRowsForDistrict(rows, districtSlug),
    districtSlug
  );

  if (primary.length >= minPrimary) {
    return { primary, fallback: [] };
  }

  const primaryIds = new Set(primary.map((r) => r.id));
  const fallback = rows
    .filter((r) => !primaryIds.has(r.id))
    .filter((r) => geoFromRecord(r).is_chhattisgarh)
    .slice(0, maxFallback);

  return { primary, fallback };
}

/**
 * Sort district hub rows so primary_district matches lead over multi-geo tags.
 */
export function prioritizePrimaryDistrict(
  rows: GeneratedArticleRow[],
  districtSlug: string
): GeneratedArticleRow[] {
  return [...rows].sort((a, b) => {
    const ga = geoFromRecord(a);
    const gb = geoFromRecord(b);
    const ap = ga.primary_district === districtSlug ? 1 : 0;
    const bp = gb.primary_district === districtSlug ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return 0;
  });
}
