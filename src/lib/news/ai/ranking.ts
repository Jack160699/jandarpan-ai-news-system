/**
 * AI homepage ranking — regional-first priority scoring with explainable metadata
 */

import { titleSimilarity } from "@/lib/news/normalize";
import {
  buildRegionalRankingSnapshot,
  geoFromRecord,
  scoreRegionalTopicFromArticle,
} from "@/lib/regional";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const LIVE_WINDOW_HOURS = 8;
const STALE_AFTER_HOURS = 48;
// IMPORTANT: do not boost clickbait-y "breaking" phrases from text.

const CATEGORY_WEIGHT: Record<HomeSectionId, number> = {
  chhattisgarh: 1,
  raipur: 0.95,
  india: 0.72,
  business: 0.68,
  education: 0.65,
  sports: 0.62,
  world: 0.58,
};

export type RankingFactorBreakdown = {
  freshness: number;
  regional: number;
  districtBoost: number;
  verifiedSources: number;
  urgency: number;
  readerValue: number;
  editorialQuality: number;
  category: number;
  clickbaitPenalty: number;
  staleDecay: number;
  duplicatePenalty: number;
};

export type RankingMetadata = {
  priorityScore: number;
  factors: RankingFactorBreakdown;
  reasons: string[];
  isTrending: boolean;
  isBreaking: boolean;
  duplicateClusterId: string | null;
  rankedAt: string;
};

export type RankedArticleInput = {
  row: GeneratedArticleRow;
  section: HomeSectionId;
};

export type RankedArticleOutput = RankedArticleInput & {
  ranking: RankingMetadata;
};

/** Personalization — district routing, CG-first policy */
export type RankingPersonalization = {
  preferredSections?: HomeSectionId[];
  regionBoostMultiplier?: number;
  boostSlugs?: string[];
  homeDistrict?: string | null;
};

export type HomepageRankingAnalytics = {
  poolSize: number;
  rankedCount: number;
  trendingCount: number;
  breakingCount: number;
  duplicateClusters: number;
  avgPriorityScore: number;
  topStoryId: string | null;
  topFactors: string[];
};

function hoursSince(iso: string | null): number {
  if (!iso) return 72;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  return inter / Math.max(a.size, b.size);
}

function inferSectionFromRow(row: GeneratedArticleRow): HomeSectionId {
  const tag = row.tags[0]?.toLowerCase() ?? "";
  const text = `${row.headline} ${row.summary ?? ""}`.toLowerCase();

  if (/raipur|रायपुर|naya raipur/i.test(text)) return "raipur";
  if (/chhattisgarh|bastar|bilaspur|छत्तीसगढ|बस्तर/i.test(text)) {
    return "chhattisgarh";
  }
  if (/sport|cricket|खेल/i.test(text)) return "sports";
  if (/business|economy|market|व्यापार/i.test(text)) return "business";
  if (/education|school|शिक्षा/i.test(text)) return "education";
  if (/world|global|international/i.test(text)) return "world";
  if (/\bindia\b|national|भारत/i.test(text)) return "india";

  const tagMap: Record<string, HomeSectionId> = {
    local: "chhattisgarh",
    politics: "india",
    world: "world",
    business: "business",
    sports: "sports",
    health: "education",
    technology: "business",
  };

  return tagMap[tag] ?? "chhattisgarh";
}

function scoreFreshness(hours: number): number {
  if (hours <= 1) return 28;
  if (hours <= 3) return 24;
  if (hours <= 6) return 20;
  if (hours <= 12) return 14;
  if (hours <= 24) return 8;
  if (hours <= 36) return 4;
  return 0;
}

function scoreStaleDecay(hours: number): number {
  if (hours <= STALE_AFTER_HOURS) return 0;
  const excess = hours - STALE_AFTER_HOURS;
  return Math.min(22, excess * 0.45);
}

function scoreRegional(
  section: HomeSectionId,
  personalization?: RankingPersonalization
): number {
  const mult = personalization?.regionBoostMultiplier ?? 1;
  let base = 0;
  if (section === "chhattisgarh") base = 22;
  else if (section === "raipur") base = 20;
  else if (section === "india") base = 8;
  else base = 4;

  if (personalization?.preferredSections?.includes(section)) {
    base += 6;
  }

  return base * mult;
}

function scoreDistrictBoost(
  row: GeneratedArticleRow,
  personalization?: RankingPersonalization
): number {
  const topic = scoreRegionalTopicFromArticle(row, personalization?.homeDistrict);
  return Math.min(16, topic.districtBoost + topic.cgStateBoost * 0.35);
}

function scoreSourceTrust(row: GeneratedArticleRow): number {
  // Back-compat shim (kept for any external callers); replaced by
  // scoreVerifiedSources + scoreEditorialQuality in the homepage scoring path.
  const meta = row.editorial_metadata ?? {};
  const sources = meta.source_attribution ?? [];
  const avgConf =
    sources.length > 0
      ? sources.reduce((s, a) => s + (a.confidence ?? 0.5), 0) / sources.length
      : (meta.ai_confidence ?? 0.5);
  const unique = new Set(
    sources.map((s) => (s.source ?? "").trim().toLowerCase()).filter(Boolean)
  ).size;
  return Math.min(18, avgConf * 12 + Math.min(10, unique * 3) * 0.35);
}

const TRUSTED_SOURCE_MARKERS = [
  "pti",
  "ani",
  "reuters",
  "associated press",
  " ap ",
  "bbc",
  "the hindu",
  "indian express",
  "ndtv",
  "india today",
] as const;

function scoreVerifiedSources(row: GeneratedArticleRow): number {
  const meta = row.editorial_metadata ?? {};
  const sources = Array.isArray(meta.source_attribution) ? meta.source_attribution : [];

  const uniqueSources = new Set(
    sources.map((s) => (s.source ?? "").trim().toLowerCase()).filter(Boolean)
  );
  const uniqueCount = Math.max(0, uniqueSources.size);

  const avgAttributionConfidence =
    sources.length > 0
      ? sources.reduce((s, a) => s + Number(a.confidence ?? 0.5), 0) / sources.length
      : Number(meta.ai_confidence ?? 0.5);

  const trustedHit =
    [...uniqueSources].some((s) => TRUSTED_SOURCE_MARKERS.some((m) => s.includes(m))) ||
    TRUSTED_SOURCE_MARKERS.some((m) =>
      `${row.headline} ${row.summary ?? ""}`.toLowerCase().includes(m)
    );

  // Verified sources priority: unique > count hint > attribution confidence.
  let score = 0;
  score += Math.min(16, uniqueCount * 5); // 0..16
  if (trustedHit) score += 6;
  score += Math.min(10, avgAttributionConfidence * 10);

  // Penalize fallback-only drafts slightly (they can still be high quality).
  if (meta.used_fallback) score -= 3;

  return Math.max(0, Math.min(26, score));
}

function scoreReaderValue(row: GeneratedArticleRow): number {
  // Reader value: completeness + scannability + useful tags + image presence.
  let score = 0;
  const summaryLen = row.summary?.trim().length ?? 0;
  const bodyLen = row.article_body?.trim().length ?? 0;

  if (row.hero_image_url) score += 5;
  if (summaryLen >= 90) score += 5;
  if (bodyLen >= 650) score += 8;
  else if (bodyLen >= 380) score += 5;
  if ((row.tags?.length ?? 0) >= 2) score += 2;

  const headlineWords = row.headline.split(/\s+/).filter(Boolean).length;
  if (headlineWords >= 6 && headlineWords <= 14) score += 3;

  return Math.max(0, Math.min(22, score));
}

function scoreEditorialQuality(row: GeneratedArticleRow): number {
  const meta = row.editorial_metadata ?? {};
  const q =
    (meta.quality_breakdown as
      | {
          readability?: number;
          seo_quality?: number;
          local_relevance?: number;
          originality?: number;
          structure?: number;
          spam_score?: number;
        }
      | undefined) ?? {};

  const readability = Number(q.readability ?? 0.45);
  const seo = Number(q.seo_quality ?? 0.45);
  const local = Number(q.local_relevance ?? 0.45);
  const originality = Number(q.originality ?? 0.45);
  const structure = Number(q.structure ?? 0.45);
  const spam = Number(q.spam_score ?? 0);

  // Weighted editorial quality (0..24). Strongly favors local relevance + readability.
  const raw =
    readability * 7 +
    local * 7 +
    originality * 4 +
    seo * 4 +
    structure * 2 -
    spam * 6;

  return Math.max(0, Math.min(24, Math.round(raw * 10) / 10));
}

function scoreUrgency(row: GeneratedArticleRow, hours: number): number {
  const meta = row.editorial_metadata ?? {};
  let score = 0;

  // Time-based urgency.
  if (hours <= 1) score += 13;
  else if (hours <= 3) score += 10;
  else if (hours <= 6) score += 7;
  else if (hours <= LIVE_WINDOW_HOURS) score += 4;

  // Use model-derived signals, not headline buzzwords.
  const breakingScore = Number(meta.breaking_score ?? 0);
  const trendScore = Number(meta.trend_score ?? 0);
  score += Math.min(8, breakingScore * 8);
  score += Math.min(6, trendScore * 6);

  // Multi-source adds urgency confidence (verified stories move faster).
  const srcCount = Number(meta.source_count ?? meta.source_attribution?.length ?? 1);
  if (srcCount >= 3) score += 3;

  return Math.max(0, Math.min(26, score));
}

function scoreCategory(section: HomeSectionId): number {
  return CATEGORY_WEIGHT[section] * 12;
}

function scoreClickbaitPenalty(row: GeneratedArticleRow): number {
  const meta = row.editorial_metadata ?? {};
  const quality =
    (meta.quality_report as { clickbait_flags?: string[] } | undefined) ?? {};
  const flags = Array.isArray(quality.clickbait_flags) ? quality.clickbait_flags : [];
  if (flags.length === 0) return 0;
  // Penalize clickbait signals; never boost them.
  return Math.min(12, 4 + flags.length * 3);
}

function buildDuplicateClusters(
  items: RankedArticleInput[]
): Map<string, string> {
  const clusterById = new Map<string, string>();
  let clusterSeq = 0;

  for (const item of items) {
    const eventId = item.row.event_id?.trim();
    if (!eventId) continue;

    const sibling = items.find(
      (other) =>
        other.row.id !== item.row.id &&
        other.row.event_id?.trim() === eventId
    );
    if (!sibling) continue;

    const idA = item.row.id;
    const idB = sibling.row.id;
    const clusterA = clusterById.get(idA);
    const clusterB = clusterById.get(idB);
    const clusterId = clusterA ?? clusterB ?? `dup-${clusterSeq++}`;
    clusterById.set(idA, clusterId);
    clusterById.set(idB, clusterId);
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = titleSimilarity(
        items[i].row.headline,
        items[j].row.headline
      );
      const tokenSim = tokenOverlap(
        titleTokens(items[i].row.headline),
        titleTokens(items[j].row.headline)
      );
      const duplicate = sim >= 0.78 || tokenSim >= 0.55;

      if (!duplicate) continue;

      const idA = items[i].row.id;
      const idB = items[j].row.id;
      const clusterA = clusterById.get(idA);
      const clusterB = clusterById.get(idB);
      const clusterId = clusterA ?? clusterB ?? `dup-${clusterSeq++}`;

      clusterById.set(idA, clusterId);
      clusterById.set(idB, clusterId);
    }
  }

  return clusterById;
}

function duplicatePenaltyForArticle(
  articleId: string,
  clusterById: Map<string, string>,
  priorityById: Map<string, number>
): number {
  const clusterId = clusterById.get(articleId);
  if (!clusterId) return 0;

  const siblings = [...clusterById.entries()].filter(
    ([, c]) => c === clusterId
  );
  if (siblings.length <= 1) return 0;

  const scores = siblings.map(([id]) => priorityById.get(id) ?? 0);
  const maxScore = Math.max(...scores);
  const myScore = priorityById.get(articleId) ?? 0;

  if (myScore >= maxScore - 0.5) return 0;
  return Math.min(18, 8 + (maxScore - myScore) * 0.15);
}

function buildReasons(factors: RankingFactorBreakdown, flags: {
  isBreaking: boolean;
  isTrending: boolean;
  duplicatePenalty: number;
  section: HomeSectionId;
}): string[] {
  const reasons: string[] = [];

  if (flags.isBreaking) reasons.push("breaking_news_boost");
  if (factors.freshness >= 20) reasons.push("high_freshness");
  if (factors.regional >= 18) reasons.push("regional_priority");
  if (factors.districtBoost >= 10) reasons.push("district_hyperlocal_boost");
  if (factors.verifiedSources >= 14) reasons.push("verified_sources_priority");
  if (factors.editorialQuality >= 14) reasons.push("high_editorial_quality");
  if (factors.readerValue >= 12) reasons.push("high_reader_value");
  if (flags.isTrending) reasons.push("trending_velocity");
  if (flags.duplicatePenalty > 0) reasons.push("duplicate_cluster_penalty");
  if (factors.clickbaitPenalty > 0) reasons.push("clickbait_penalty");
  if (factors.staleDecay > 8) reasons.push("stale_content_decay");
  if (flags.section === "chhattisgarh" || flags.section === "raipur") {
    reasons.push("cg_first_policy");
  }

  return reasons.slice(0, 6);
}

/**
 * Compute homepage priority score for one article (0–100).
 */
export function computeHomepagePriorityScore(
  row: GeneratedArticleRow,
  section: HomeSectionId,
  options?: {
    personalization?: RankingPersonalization;
    duplicatePenalty?: number;
  }
): { score: number; factors: RankingFactorBreakdown; isBreaking: boolean } {
  const hours = hoursSince(row.published_at ?? row.created_at);
  const personalization = options?.personalization;

  const freshness = scoreFreshness(hours);
  const staleDecay = scoreStaleDecay(hours);
  const regional = scoreRegional(section, personalization);
  const districtBoost = scoreDistrictBoost(row, personalization);
  const urgency = scoreUrgency(row, hours);
  const verifiedSources = scoreVerifiedSources(row);
  const readerValue = scoreReaderValue(row);
  const editorialQuality = scoreEditorialQuality(row);
  const category = scoreCategory(section);
  const clickbaitPenalty = scoreClickbaitPenalty(row);
  const duplicatePenalty = options?.duplicatePenalty ?? 0;

  let slugBoost = 0;
  if (personalization?.boostSlugs?.includes(row.slug)) slugBoost = 8;

  // Reduce duplicate national stories: slightly downweight india section unless strongly regional.
  const meta = row.editorial_metadata ?? {};
  const hasRegionalSignal =
    geoFromRecord(row).is_chhattisgarh ||
    Boolean(geoFromRecord(row).primary_district) ||
    Number(meta.local_relevance ?? meta.quality_breakdown?.local_relevance ?? 0) >= 0.6;
  const nationalCrowdPenalty =
    section === "india" && !hasRegionalSignal ? 6 : 0;

  const raw =
    freshness +
    urgency +
    regional +
    districtBoost +
    verifiedSources +
    readerValue +
    editorialQuality +
    category +
    slugBoost -
    staleDecay -
    duplicatePenalty -
    clickbaitPenalty -
    nationalCrowdPenalty;

  const score = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

  return {
    score,
    factors: {
      freshness,
      urgency,
      regional,
      districtBoost,
      verifiedSources,
      readerValue,
      editorialQuality,
      category,
      clickbaitPenalty,
      staleDecay,
      duplicatePenalty,
    },
    // Breaking = model-derived breaking score or breaking override.
    isBreaking: Number(meta.breaking_score ?? 0) >= 0.75 || Boolean(meta.breaking_override),
  };
}

/**
 * Rank articles for homepage visibility (regional-first, deduped).
 */
export function rankArticlesForHomepage(
  rows: GeneratedArticleRow[],
  options?: { personalization?: RankingPersonalization }
): RankedArticleOutput[] {
  const inputs: RankedArticleInput[] = rows.map((row) => ({
    row,
    section: inferSectionFromRow(row),
  }));

  const clusterById = buildDuplicateClusters(inputs);

  const preliminary = inputs.map((item) => {
    const { score, factors, isBreaking } = computeHomepagePriorityScore(
      item.row,
      item.section,
      { personalization: options?.personalization }
    );
    return { item, score, factors, isBreaking };
  });

  const priorityById = new Map(
    preliminary.map((p) => [p.item.row.id, p.score])
  );

  const withDupPenalty = preliminary.map((p) => {
    const dupPenalty = duplicatePenaltyForArticle(
      p.item.row.id,
      clusterById,
      priorityById
    );
    const { score, factors, isBreaking } = computeHomepagePriorityScore(
      p.item.row,
      p.item.section,
      {
        personalization: options?.personalization,
        duplicatePenalty: dupPenalty,
      }
    );
    return { ...p.item, score, factors, isBreaking, dupPenalty };
  });

  const sorted = [...withDupPenalty].sort((a, b) => b.score - a.score);
  const trendingIds = detectTrendingArticleIds(sorted);

  const ranked: RankedArticleOutput[] = sorted.map((entry) => {
    const isTrending = trendingIds.has(entry.row.id);
    const reasons = buildReasons(entry.factors, {
      isBreaking: entry.isBreaking,
      isTrending,
      duplicatePenalty: entry.dupPenalty,
      section: entry.section,
    });

    return {
      row: entry.row,
      section: entry.section,
      ranking: {
        priorityScore: entry.score,
        factors: entry.factors,
        reasons,
        isTrending,
        isBreaking: entry.isBreaking,
        duplicateClusterId: clusterById.get(entry.row.id) ?? null,
        rankedAt: new Date().toISOString(),
      },
    };
  });

  logHomepageRankingAnalytics(ranked);

  const cgCount = rows.filter((r) => geoFromRecord(r).is_chhattisgarh).length;
  const districtTagged = rows.filter(
    (r) => (geoFromRecord(r).districts?.length ?? 0) > 0
  ).length;
  const scores = rows.map((r) =>
    scoreRegionalTopicFromArticle(r, options?.personalization?.homeDistrict).score
  );
  const avgRegionalScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

  buildRegionalRankingSnapshot({
    poolSize: rows.length,
    cgCount,
    districtTagged,
    topDistrict: ranked[0] ? geoFromRecord(ranked[0].row).primary_district : null,
    avgRegionalScore,
  });

  return ranked;
}

/**
 * Trending = top velocity stories (fresh + high priority vs pool median).
 */
export function detectTrendingArticleIds(
  ranked: Array<{ row: GeneratedArticleRow; score: number }>
): Set<string> {
  if (ranked.length < 3) {
    return new Set(ranked.slice(0, 2).map((r) => r.row.id));
  }

  const scores = ranked.map((r) => r.score);
  const median = scores[Math.floor(scores.length / 2)] ?? 0;
  const threshold = median + 8;

  const trending = new Set<string>();

  for (const entry of ranked) {
    const hours = hoursSince(entry.row.published_at ?? entry.row.created_at);
    if (entry.score >= threshold && hours <= 36) {
      trending.add(entry.row.id);
    }
    if (trending.size >= 10) break;
  }

  if (!trending.size) {
    ranked.slice(0, 5).forEach((r) => trending.add(r.row.id));
  }

  return trending;
}

export function buildHomepageRankingAnalytics(
  ranked: RankedArticleOutput[]
): HomepageRankingAnalytics {
  const trendingCount = ranked.filter((r) => r.ranking.isTrending).length;
  const breakingCount = ranked.filter((r) => r.ranking.isBreaking).length;
  const clusters = new Set(
    ranked
      .map((r) => r.ranking.duplicateClusterId)
      .filter(Boolean) as string[]
  );

  const avg =
    ranked.length > 0
      ? ranked.reduce((s, r) => s + r.ranking.priorityScore, 0) / ranked.length
      : 0;

  const top = ranked[0];

  return {
    poolSize: ranked.length,
    rankedCount: ranked.length,
    trendingCount,
    breakingCount,
    duplicateClusters: clusters.size,
    avgPriorityScore: Math.round(avg * 10) / 10,
    topStoryId: top?.row.id ?? null,
    topFactors: top?.ranking.reasons.slice(0, 4) ?? [],
  };
}

export function logHomepageRankingAnalytics(
  ranked: RankedArticleOutput[]
): HomepageRankingAnalytics {
  const analytics = buildHomepageRankingAnalytics(ranked);

  logNewsroom("ranking", "homepage_rank_complete", {
    ...analytics,
    topHeadline: ranked[0]?.row.headline?.slice(0, 80),
    topScore: ranked[0]?.ranking.priorityScore,
  });

  console.log("[ranking] homepage_priority", JSON.stringify(analytics));

  return analytics;
}
