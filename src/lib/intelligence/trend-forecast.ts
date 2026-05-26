/**
 * Trend forecasting — topic momentum + 24h projection
 */

import { detectLocalTrends } from "@/lib/regional/trends";
import type { TrendForecast } from "@/lib/intelligence/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export function forecastTrends(
  articles: GeneratedArticleRow[],
  options?: { maxTopics?: number }
): TrendForecast[] {
  const maxTopics = options?.maxTopics ?? 10;
  const signals = detectLocalTrends(articles, { maxSignals: maxTopics, windowHours: 72 });

  return signals.map((s) => {
    const momentum = Math.min(1, s.velocity / 8);
    const direction: TrendForecast["direction"] =
      momentum >= 0.55 ? "rising" : momentum >= 0.28 ? "stable" : "falling";
    const forecast24h = Math.round(
      Math.min(1, momentum + (direction === "rising" ? 0.12 : direction === "falling" ? -0.08 : 0)) *
        1000
    ) / 1000;

    return {
      topic: s.label,
      direction,
      momentum: Math.round(momentum * 1000) / 1000,
      forecast24h,
      sampleHeadlines: s.sampleHeadlines,
    };
  });
}

export function buildTopicMomentum(
  articles: GeneratedArticleRow[]
): import("@/lib/intelligence/types").TopicMomentum[] {
  const signals = detectLocalTrends(articles, { maxSignals: 14, windowHours: 48 });
  return signals.map((s) => ({
    topicKey: s.key,
    label: s.label,
    momentum: Math.min(1, Math.round((s.velocity / 10) * 1000) / 1000),
    articleCount: s.count,
    velocity: Math.round(s.velocity * 100) / 100,
  }));
}
