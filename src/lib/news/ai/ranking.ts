/**
 * AI homepage ranking — regional-first priority scoring with explainable metadata
 */

import { titleSimilarity } from "@/lib/news/normalize";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const LIVE_WINDOW_HOURS = 8;
const STALE_AFTER_HOURS = 48;
const BREAKING_RE =
  /\b(breaking|live|urgent|exclusive|alert|ब्रेकिंग|लाइव|ताजा|बड़ी खबर)\b/i;

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
  urgency: number;
  regional: number;
  sourceTrust: number;
  engagement: number;
  category: number;
  breakingBoost: number;
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

/** Personalization hooks (future: user prefs, geo, reading history) */
export type RankingPersonalization = {
  preferredSections?: HomeSectionId[];
  regionBoostMultiplier?: number;
  boostSlugs?: string[];
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

function scoreSourceTrust(row: GeneratedArticleRow): number {
  const meta = row.editorial_metadata ?? {};
  const confidence = meta.ai_confidence ?? 0.5;
  const sources = meta.source_attribution ?? [];
  const avgConf =
    sources.length > 0
      ? sources.reduce((s, a) => s + (a.confidence ?? 0.5), 0) / sources.length
      : confidence;

  const countBoost = Math.min(10, (meta.source_count ?? sources.length ?? 1) * 2.5);
  return Math.min(18, avgConf * 12 + countBoost * 0.35);
}

function scoreEngagement(row: GeneratedArticleRow): number {
  let score = 0;
  const summaryLen = row.summary?.trim().length ?? 0;
  const bodyLen = row.article_body?.trim().length ?? 0;

  if (row.hero_image_url) score += 5;
  if (summaryLen > 80) score += 4;
  if (bodyLen > 400) score += 5;
  if ((row.tags?.length ?? 0) >= 2) score += 2;

  const headlineWords = row.headline.split(/\s+/).length;
  if (headlineWords >= 6 && headlineWords <= 14) score += 3;

  return Math.min(16, score);
}

function scoreUrgency(row: GeneratedArticleRow, hours: number): number {
  const meta = row.editorial_metadata ?? {};
  let score = 0;

  if (hours <= 2) score += 12;
  else if (hours <= 6) score += 8;
  else if (hours <= LIVE_WINDOW_HOURS) score += 4;

  if (BREAKING_RE.test(row.headline)) score += 10;
  if ((meta.source_count ?? 1) >= 3) score += 4;

  return Math.min(20, score);
}

function scoreCategory(section: HomeSectionId): number {
  return CATEGORY_WEIGHT[section] * 12;
}

function scoreBreakingBoost(row: GeneratedArticleRow, hours: number): number {
  if (!BREAKING_RE.test(`${row.headline} ${row.summary ?? ""}`)) return 0;
  if (hours > LIVE_WINDOW_HOURS) return 4;
  return 14;
}

function buildDuplicateClusters(
  items: RankedArticleInput[]
): Map<string, string> {
  const clusterById = new Map<string, string>();
  let clusterSeq = 0;

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
  if (factors.sourceTrust >= 12) reasons.push("trusted_multi_source");
  if (factors.engagement >= 10) reasons.push("strong_engagement_signals");
  if (flags.isTrending) reasons.push("trending_velocity");
  if (flags.duplicatePenalty > 0) reasons.push("duplicate_cluster_penalty");
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
  const sourceTrust = scoreSourceTrust(row);
  const engagement = scoreEngagement(row);
  const urgency = scoreUrgency(row, hours);
  const category = scoreCategory(section);
  const breakingBoost = scoreBreakingBoost(row, hours);
  const duplicatePenalty = options?.duplicatePenalty ?? 0;

  let slugBoost = 0;
  if (personalization?.boostSlugs?.includes(row.slug)) slugBoost = 8;

  const raw =
    freshness +
    urgency +
    regional +
    sourceTrust +
    engagement +
    category +
    breakingBoost +
    slugBoost -
    staleDecay -
    duplicatePenalty;

  const score = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

  return {
    score,
    factors: {
      freshness,
      urgency,
      regional,
      sourceTrust,
      engagement,
      category,
      breakingBoost,
      staleDecay,
      duplicatePenalty,
    },
    isBreaking: breakingBoost > 0,
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
