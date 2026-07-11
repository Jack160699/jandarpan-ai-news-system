/**
 * Hybrid SERP — keyword prioritizer
 *
 * Ranks tracked keywords using GSC signals, ranking drops, and competitor gaps.
 * SerpAPI budget is spent only on the highest-priority candidates.
 */

import { normalizeKeyword } from "@/lib/serp-intelligence/keywords";
import type { GscQueryRecord } from "@/lib/gsc-intelligence/types";
import type { GapReportRecord } from "@/lib/seo-intelligence/types";
import type {
  PrioritizedKeyword,
  SerpKeywordRecord,
} from "@/lib/serp-intelligence/types";

export interface KeywordPrioritizationContext {
  gscQueries: GscQueryRecord[];
  rankingDrops: Map<string, number>;
  gapKeywords: Map<string, number>;
}

function normalizeForMatch(value: string): string {
  return normalizeKeyword(value).toLowerCase();
}

function findGscMatch(
  queries: GscQueryRecord[],
  keyword: string
): GscQueryRecord | undefined {
  const normalized = normalizeForMatch(keyword);
  const exact = queries.find(
    (q) => normalizeForMatch(q.query) === normalized
  );
  if (exact) return exact;

  return queries.find((q) => {
    const qNorm = normalizeForMatch(q.query);
    return qNorm.includes(normalized) || normalized.includes(qNorm);
  });
}

export function buildGapKeywordMap(
  gaps: GapReportRecord[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const gap of gaps) {
    if (!gap.keyword) continue;
    const key = normalizeForMatch(gap.keyword);
    const existing = map.get(key) ?? 0;
    map.set(key, Math.max(existing, gap.gap_score));
  }
  return map;
}

export function scoreKeyword(
  keyword: SerpKeywordRecord,
  context: KeywordPrioritizationContext
): PrioritizedKeyword {
  let priorityScore = 0;
  const signals: PrioritizedKeyword["signals"] = {};

  const gsc = findGscMatch(context.gscQueries, keyword.keyword);
  if (gsc) {
    signals.gscImpressions = gsc.impressions;
    signals.gscClicks = gsc.clicks;
    signals.gscTrend = gsc.trend;

    priorityScore += Math.log10(gsc.impressions + 1) * 30;
    priorityScore += Math.log10(gsc.clicks + 1) * 25;

    if (gsc.trend === "rising") {
      priorityScore += 40;
    }

    const drop =
      gsc.position_delta != null && gsc.position_delta > 0
        ? gsc.position_delta
        : 0;
    if (drop > 0) {
      signals.rankingDrop = drop;
      priorityScore += Math.min(drop * 8, 50);
    }
  }

  const serpDrop = context.rankingDrops.get(keyword.id);
  if (serpDrop != null && serpDrop > 0) {
    signals.rankingDrop = Math.max(signals.rankingDrop ?? 0, serpDrop);
    priorityScore += Math.min(serpDrop * 10, 60);
  }

  const gapScore = context.gapKeywords.get(normalizeForMatch(keyword.keyword));
  if (gapScore != null) {
    signals.competitorGapScore = gapScore;
    priorityScore += Math.min(gapScore * 0.6, 50);
  }

  if (keyword.is_custom) {
    priorityScore += 15;
  }

  return {
    keyword,
    priorityScore: Math.round(priorityScore * 100) / 100,
    signals,
  };
}

export function prioritizeKeywords(
  keywords: SerpKeywordRecord[],
  context: KeywordPrioritizationContext
): PrioritizedKeyword[] {
  return keywords
    .map((keyword) => scoreKeyword(keyword, context))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export async function loadKeywordPrioritizationContext(): Promise<KeywordPrioritizationContext> {
  const { listQueries } = await import("@/lib/gsc-intelligence/repository");
  const { loadRecentJandarpanRankingDrops, loadTopGapKeywords } =
    await import("@/lib/serp-intelligence/repository");

  const [gscQueries, rankingDrops, gaps] = await Promise.all([
    listQueries(250),
    loadRecentJandarpanRankingDrops(),
    loadTopGapKeywords(50),
  ]);

  return {
    gscQueries,
    rankingDrops,
    gapKeywords: buildGapKeywordMap(gaps),
  };
}
