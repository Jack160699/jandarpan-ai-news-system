import type { NewsArticleRow } from "@/lib/types/news-article";

export type RelatedStoryPartitions = {
  grid: NewsArticleRow[];
  continue: NewsArticleRow[];
};

/** Split related pool so grid and continue blocks never repeat the same story */
export function partitionRelatedStories(
  related: NewsArticleRow[],
  gridCount = 6,
  continueCount = 4
): RelatedStoryPartitions {
  const grid = related.slice(0, gridCount);
  const gridIds = new Set(grid.map((a) => a.id));
  const continueArticles = related
    .slice(gridCount)
    .filter((a) => !gridIds.has(a.id))
    .slice(0, continueCount);

  return { grid, continue: continueArticles };
}
