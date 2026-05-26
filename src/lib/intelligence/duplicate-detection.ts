/**
 * Duplicate story detection — headline clusters across article pool
 */

import { assignDuplicateCluster } from "@/lib/news/ai/editorial-intelligence";
import type { DuplicateMatch } from "@/lib/intelligence/types";

export type ArticleHeadlineRow = {
  id: string;
  headline: string;
  slug: string;
};

export function detectDuplicateStories(
  articles: ArticleHeadlineRow[]
): DuplicateMatch[] {
  const headlines = articles.map((a) => a.headline);
  const matches: DuplicateMatch[] = [];
  const seenClusters = new Set<string>();

  for (const article of articles) {
    const others = headlines.filter((h) => h !== article.headline);
    const cluster = assignDuplicateCluster(article.headline, others);
    if (!cluster || cluster.similarity < 0.78) continue;
    if (seenClusters.has(cluster.clusterId)) continue;
    seenClusters.add(cluster.clusterId);

    matches.push({
      articleId: article.id,
      headline: article.headline,
      clusterId: cluster.clusterId,
      similarity: cluster.similarity,
      clusterSize: cluster.clusterSize,
      nearestHeadline: cluster.nearestHeadline,
    });
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

export function countDuplicateClusters(matches: DuplicateMatch[]): number {
  return new Set(matches.map((m) => m.clusterId)).size;
}
