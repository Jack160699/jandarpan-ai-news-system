/**
 * Module 6 — Trending Topics (competitor clustering)
 */

import {
  clusterKeyFromKeywords,
  extractTopKeywords,
  isToday,
} from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisCompetitorArticle,
  TopicTrend,
  TrendingTopicRecord,
} from "@/lib/seo-intelligence/types";

type ClusterAccumulator = {
  topic: string;
  keywords: string[];
  articles: AnalysisCompetitorArticle[];
  competitors: Set<string>;
  district: string | null;
  lastSeen: string;
};

export function clusterTrendingTopics(
  articles: AnalysisCompetitorArticle[],
  now = new Date()
): TrendingTopicRecord[] {
  const clusters = new Map<string, ClusterAccumulator>();

  for (const article of articles) {
    const keywords = extractTopKeywords(
      `${article.title} ${article.description ?? ""}`,
      3
    );
    if (keywords.length === 0) continue;

    const clusterKey = clusterKeyFromKeywords(keywords);
    const existing = clusters.get(clusterKey) ?? {
      topic: keywords[0]!,
      keywords,
      articles: [],
      competitors: new Set<string>(),
      district: article.district,
      lastSeen: article.published_at ?? article.fetched_at,
    };

    existing.articles.push(article);
    if (article.source_name) existing.competitors.add(article.source_name);
    if (!existing.district && article.district) {
      existing.district = article.district;
    }
    const seen = article.published_at ?? article.fetched_at;
    if (new Date(seen) > new Date(existing.lastSeen)) existing.lastSeen = seen;
    clusters.set(clusterKey, existing);
  }

  return [...clusters.values()]
    .map((cluster) => {
      const recentCount = cluster.articles.filter((a) =>
        isToday(a.published_at ?? a.fetched_at, now)
      ).length;
      const total = cluster.articles.length;
      const competitorCount = cluster.competitors.size;

      let trend: TopicTrend = "trending";
      if (recentCount >= 3 && competitorCount >= 2) trend = "breaking";
      else if (recentCount >= 2) trend = "growing";
      else if (recentCount === 0 && total > 2) trend = "declining";

      const score = Math.min(
        100,
        recentCount * 20 + competitorCount * 10 + total * 3
      );

      return {
        topic: cluster.topic,
        cluster_key: clusterKeyFromKeywords(cluster.keywords),
        trend,
        article_count: total,
        competitor_count: competitorCount,
        district: cluster.district,
        keywords: cluster.keywords,
        score,
        last_seen: cluster.lastSeen,
        metadata: { recentCount },
      };
    })
    .filter((c) => c.article_count >= 2)
    .sort((a, b) => b.score - a.score);
}
