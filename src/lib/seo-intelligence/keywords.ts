/**
 * Module 2 — Keyword Intelligence
 */

import {
  classifyEntity,
  detectDistrictInText,
  extractTopKeywords,
  isToday,
} from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisCompetitorArticle,
  KeywordIntelligenceRecord,
  SeoTrend,
} from "@/lib/seo-intelligence/types";

type KeywordAccumulator = {
  keyword: string;
  frequency: number;
  competitors: Set<string>;
  district: string | null;
  entity_type: ReturnType<typeof classifyEntity>;
  recentCount: number;
  olderCount: number;
  lastSeen: string;
};

export function buildKeywordIntelligence(
  articles: AnalysisCompetitorArticle[],
  now = new Date()
): KeywordIntelligenceRecord[] {
  const map = new Map<string, KeywordAccumulator>();

  for (const article of articles) {
    const keywords = extractTopKeywords(
      `${article.title} ${article.description ?? ""}`,
      6
    );
    const competitor = article.source_name ?? "unknown";
    const district =
      article.district ??
      detectDistrictInText(`${article.title} ${article.description ?? ""}`);
    const seenAt = article.published_at ?? article.fetched_at;
    const recent = isToday(seenAt, now);

    for (const keyword of keywords) {
      const key = keyword.toLowerCase();
      const existing = map.get(key) ?? {
        keyword,
        frequency: 0,
        competitors: new Set<string>(),
        district,
        entity_type: classifyEntity(keyword),
        recentCount: 0,
        olderCount: 0,
        lastSeen: seenAt,
      };

      existing.frequency += 1;
      existing.competitors.add(competitor);
      if (recent) existing.recentCount += 1;
      else existing.olderCount += 1;
      if (new Date(seenAt) > new Date(existing.lastSeen)) {
        existing.lastSeen = seenAt;
      }
      if (!existing.district && district) existing.district = district;
      map.set(key, existing);
    }
  }

  return [...map.values()]
    .map((entry) => {
      let trend: SeoTrend = "stable";
      if (entry.recentCount > entry.olderCount + 1) trend = "rising";
      else if (entry.recentCount < entry.olderCount) trend = "declining";

      return {
        keyword: entry.keyword,
        frequency: entry.frequency,
        trend,
        competitors_using: [...entry.competitors],
        district: entry.district,
        entity_type: entry.entity_type,
        last_seen: entry.lastSeen,
        metadata: {
          recentCount: entry.recentCount,
          olderCount: entry.olderCount,
        },
      };
    })
    .sort((a, b) => b.frequency - a.frequency);
}

export function getPrimaryKeyword(title: string): string | null {
  return extractTopKeywords(title, 1)[0] ?? null;
}

export function getSecondaryKeywords(title: string): string[] {
  return extractTopKeywords(title, 4).slice(1);
}
