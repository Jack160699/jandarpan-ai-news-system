import type { BreakingTickerItem } from "../types";
import { sortByPriority } from "../validate";
import { MOCK_ARTICLES } from "./articles";

const BREAKING_TTL_HOURS = 6;

export function buildMockBreakingTicker(): BreakingTickerItem[] {
  const now = Date.now();
  const items = MOCK_ARTICLES.filter((a) => a.breaking || a.category === "breaking_news")
    .map((a) => ({
      id: a.id,
      headline: a.title,
      slug: a.slug,
      category: a.category,
      priority: a.priority,
      publishedAt: a.publishedAt,
      expiresAt: new Date(
        now + BREAKING_TTL_HOURS * 60 * 60 * 1000
      ).toISOString(),
      accent: "breaking" as const,
    }));

  return sortByPriority(items);
}

export function filterActiveBreaking(items: BreakingTickerItem[]): BreakingTickerItem[] {
  const now = Date.now();
  return items.filter((item) => {
    if (!item.expiresAt) return true;
    return +new Date(item.expiresAt) > now;
  });
}
