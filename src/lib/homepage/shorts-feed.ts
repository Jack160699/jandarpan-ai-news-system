/**
 * Homepage news shorts rail — build from article pool
 */

import { ensureShortCard } from "@/lib/news/shorts/ensure-card";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export function buildNewsShortsFromPool(
  rows: GeneratedArticleRow[],
  limit = 6
): NewsShortCard[] {
  const candidates = [...rows]
    .filter((r) => (r.summary?.length ?? 0) > 40)
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
    )
    .slice(0, limit * 2);

  const cards: NewsShortCard[] = [];

  for (const row of candidates) {
    const card = ensureShortCard(row);
    if (card) cards.push(card);
    if (cards.length >= limit) break;
  }

  return cards;
}

/** Trending shorts — prefer live + recent for homepage hero rail */
export function buildTrendingShortsFromPool(
  rows: GeneratedArticleRow[],
  limit = 8
): NewsShortCard[] {
  const cards = buildNewsShortsFromPool(rows, limit * 2);
  return [...cards]
    .sort((a, b) => {
      const live = (b.isLive ? 2 : 0) - (a.isLive ? 2 : 0);
      if (live !== 0) return live;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    })
    .slice(0, limit);
}
