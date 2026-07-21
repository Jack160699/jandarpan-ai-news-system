/**
 * District-first lead / story ranking with auditable reason codes.
 * Does not rank purely by newest timestamp.
 */

import type { HomeArticle } from "@/lib/homepage/types";
import {
  articleMatchesDistrict,
  articleMatchesNearby,
  isStatewideHomeArticle,
  resolveArticleDistrictSlug,
} from "./match";
import { DEFAULT_DISTRICT_SLUG } from "./constants";

export type DistrictLeadReason =
  | "exact_district_breaking"
  | "exact_district_high_priority"
  | "statewide_relevant"
  | "nearby_fallback"
  | "state_fallback"
  | "default_raipur";

export type ScoredDistrictArticle = {
  article: HomeArticle;
  score: number;
  reason: DistrictLeadReason;
  /** Extra audit trail for tests/admin — not for public UI */
  signals: string[];
};

function hoursSince(iso: string, nowMs: number): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 72;
  return Math.max(0, (nowMs - t) / 3_600_000);
}

function freshnessBoost(hours: number): number {
  if (hours <= 6) return 18;
  if (hours <= 24) return 10;
  if (hours <= 48) return 4;
  return -6;
}

function sourceReliability(article: HomeArticle): number {
  return Math.min(12, article.sourceCount * 4 + article.aiConfidence * 8);
}

function editorialImportance(article: HomeArticle): number {
  let s = article.priorityScore * 0.35;
  if (article.urgency === "high") s += 14;
  else if (article.urgency === "medium") s += 6;
  return s;
}

function publicInterestBoost(article: HomeArticle): number {
  const blob = `${article.headline} ${article.summary}`.toLowerCase();
  if (
    /\b(flood|बाढ़|accident|दुर्घटना|strike|हड़ताल|outbreak|महामारी|outage|बिजली|water|पानी|exam|परीक्षा|recruitment|भर्ती)\b/i.test(
      blob
    )
  ) {
    return 10;
  }
  return 0;
}

/**
 * Score one article for selected-district lead ranking.
 */
export function scoreDistrictLeadCandidate(
  article: HomeArticle,
  selectedDistrict: string,
  options?: {
    nowMs?: number;
    seenClusterIds?: Set<string>;
  }
): ScoredDistrictArticle {
  const nowMs = options?.nowMs ?? Date.now();
  const hours = hoursSince(article.publishedAt, nowMs);
  const signals: string[] = [];
  let score = 0;
  let reason: DistrictLeadReason = "state_fallback";

  const exact = articleMatchesDistrict(article, selectedDistrict);
  const nearby = !exact && articleMatchesNearby(article, selectedDistrict);
  const statewide = isStatewideHomeArticle(article);
  const articleDistrict = resolveArticleDistrictSlug(article);
  const isBreaking =
    article.ranking?.isBreaking ||
    article.urgency === "high" ||
    article.isLive;

  score += freshnessBoost(hours);
  signals.push(`freshness_h:${Math.round(hours)}`);
  score += editorialImportance(article);
  signals.push("editorial");
  score += sourceReliability(article);
  signals.push("source_reliability");
  score += publicInterestBoost(article);

  const clusterId = article.ranking?.duplicateClusterId;
  if (clusterId && options?.seenClusterIds?.has(clusterId)) {
    score -= 40;
    signals.push("duplicate_cluster_suppressed");
  }

  if (exact && isBreaking) {
    score += 120;
    reason = "exact_district_breaking";
    signals.push("exact_district_breaking");
  } else if (exact) {
    score += 95;
    reason = "exact_district_high_priority";
    signals.push("exact_district_high_priority");
  } else if (statewide) {
    score += 55;
    reason = "statewide_relevant";
    signals.push("statewide_relevant");
  } else if (nearby) {
    score += 28;
    reason = "nearby_fallback";
    signals.push(`nearby:${articleDistrict}`);
  } else if (
    !selectedDistrict ||
    selectedDistrict === DEFAULT_DISTRICT_SLUG
  ) {
    score += 20;
    reason = "default_raipur";
    signals.push("default_raipur");
  } else {
    score += 8;
    reason = "state_fallback";
    signals.push("state_fallback");
  }

  // Locality confidence when text clearly names the district
  if (exact) {
    score += 15;
    signals.push("locality_confidence");
  }

  return {
    article,
    score: Math.round(score * 10) / 10,
    reason,
    signals,
  };
}

export type RankDistrictStoriesResult = {
  ranked: ScoredDistrictArticle[];
  lead: ScoredDistrictArticle | null;
};

/**
 * Rank a pool for district-first homepage / मेरा जिला lead.
 * Suppresses duplicate event clusters after the first representative.
 */
export function rankDistrictStories(
  articles: HomeArticle[],
  selectedDistrict: string,
  options?: { nowMs?: number; limit?: number }
): RankDistrictStoriesResult {
  const seenClusters = new Set<string>();
  const scored = articles.map((article) =>
    scoreDistrictLeadCandidate(article, selectedDistrict, {
      nowMs: options?.nowMs,
      seenClusterIds: seenClusters,
    })
  );

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.article.id.localeCompare(b.article.id);
  });

  const ranked: ScoredDistrictArticle[] = [];
  for (const item of scored) {
    const clusterId = item.article.ranking?.duplicateClusterId;
    if (clusterId && seenClusters.has(clusterId)) continue;
    if (clusterId) seenClusters.add(clusterId);
    ranked.push(item);
    if (options?.limit && ranked.length >= options.limit) break;
  }

  return { ranked, lead: ranked[0] ?? null };
}

/** Priority order documentation for audits */
export const DISTRICT_LEAD_PRIORITY_ORDER: DistrictLeadReason[] = [
  "exact_district_breaking",
  "exact_district_high_priority",
  "statewide_relevant",
  "nearby_fallback",
  "state_fallback",
  "default_raipur",
];
