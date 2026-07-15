import type { NewsShortCard } from "@/lib/news/shorts/types";

/**
 * Preserve ranking order while preventing one desk from monopolising Top 10.
 * A second pass fills any remaining places when the live pool lacks diversity.
 */
export function selectDiverseTopTen(
  rankedShorts: NewsShortCard[],
  limit = 10
): NewsShortCard[] {
  const unique = rankedShorts.filter(
    (story, index, all) => all.findIndex((item) => item.articleId === story.articleId) === index
  );
  const selected: NewsShortCard[] = [];
  const categoryCounts = new Map<string, number>();

  for (const story of unique) {
    const category = story.section || story.categoryLabel || "news";
    const count = categoryCounts.get(category) ?? 0;
    if (count >= 2) continue;
    selected.push(story);
    categoryCounts.set(category, count + 1);
    if (selected.length >= limit) return selected;
  }

  for (const story of unique) {
    if (selected.some((item) => item.articleId === story.articleId)) continue;
    selected.push(story);
    if (selected.length >= limit) break;
  }

  return selected;
}
