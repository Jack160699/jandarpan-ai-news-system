/**
 * Homepage duplicate detection — cluster, event, headline, entity overlap
 */

import { normalizeTitle, titleSimilarity } from "@/lib/news/normalize";
import type { HomeArticle } from "@/lib/homepage/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type DuplicateIndex = {
  clusterByArticleId: Map<string, string>;
  eventIdByArticleId: Map<string, string>;
  normalizedHeadlineByArticleId: Map<string, string>;
  tokensByArticleId: Map<string, Set<string>>;
};

const ENTITY_STOP = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "that",
  "this",
  "news",
  "live",
  "today",
  "की",
  "के",
  "में",
  "से",
  "और",
  "पर",
  "को",
  "का",
  "खबर",
  "समाचार",
]);

function titleTokens(text: string): Set<string> {
  return new Set(
    normalizeTitle(text)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !ENTITY_STOP.has(w))
  );
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  return inter / Math.max(a.size, b.size);
}

function mergeClusters(
  clusterById: Map<string, string>,
  idA: string,
  idB: string,
  nextClusterId: () => string
): void {
  const clusterA = clusterById.get(idA);
  const clusterB = clusterById.get(idB);
  const clusterId = clusterA ?? clusterB ?? nextClusterId();
  clusterById.set(idA, clusterId);
  clusterById.set(idB, clusterId);
}

/**
 * Build duplicate index from ranked articles + source rows.
 * Merges ranking duplicateClusterId, event_id, headline similarity, entity overlap.
 */
export function buildDuplicateIndex(
  articles: HomeArticle[],
  rowsById: Map<string, GeneratedArticleRow>
): DuplicateIndex {
  const clusterByArticleId = new Map<string, string>();
  const eventIdByArticleId = new Map<string, string>();
  const normalizedHeadlineByArticleId = new Map<string, string>();
  const tokensByArticleId = new Map<string, Set<string>>();

  let clusterSeq = 0;
  const nextClusterId = () => `dup-${clusterSeq++}`;

  for (const article of articles) {
    normalizedHeadlineByArticleId.set(
      article.id,
      normalizeTitle(article.headline)
    );
    tokensByArticleId.set(article.id, titleTokens(article.headline));

    if (article.ranking.duplicateClusterId) {
      clusterByArticleId.set(article.id, article.ranking.duplicateClusterId);
    }

    const row = rowsById.get(article.id);
    const eventId = row?.event_id?.trim();
    if (eventId) {
      eventIdByArticleId.set(article.id, eventId);
      const eventSibling = [...eventIdByArticleId.entries()].find(
        ([id, eid]) => id !== article.id && eid === eventId
      );
      if (eventSibling) {
        mergeClusters(
          clusterByArticleId,
          article.id,
          eventSibling[0],
          nextClusterId
        );
      }
    }
  }

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const a = articles[i];
      const b = articles[j];

      const eventA = eventIdByArticleId.get(a.id);
      const eventB = eventIdByArticleId.get(b.id);
      if (eventA && eventB && eventA === eventB) {
        mergeClusters(clusterByArticleId, a.id, b.id, nextClusterId);
        continue;
      }

      const sim = titleSimilarity(a.headline, b.headline);
      const tokenSim = tokenOverlap(
        tokensByArticleId.get(a.id) ?? new Set(),
        tokensByArticleId.get(b.id) ?? new Set()
      );

      if (sim >= 0.68 || tokenSim >= 0.48) {
        mergeClusters(clusterByArticleId, a.id, b.id, nextClusterId);
      }
    }
  }

  return {
    clusterByArticleId,
    eventIdByArticleId,
    normalizedHeadlineByArticleId,
    tokensByArticleId,
  };
}

export function getDuplicateClusterId(
  article: HomeArticle,
  index: DuplicateIndex
): string | null {
  return index.clusterByArticleId.get(article.id) ?? null;
}

export function areHomepageDuplicates(
  a: HomeArticle,
  b: HomeArticle,
  index: DuplicateIndex
): boolean {
  if (a.id === b.id) return true;

  const clusterA = getDuplicateClusterId(a, index);
  const clusterB = getDuplicateClusterId(b, index);
  if (clusterA && clusterB && clusterA === clusterB) return true;

  const eventA = index.eventIdByArticleId.get(a.id);
  const eventB = index.eventIdByArticleId.get(b.id);
  if (eventA && eventB && eventA === eventB) return true;

  const normA = index.normalizedHeadlineByArticleId.get(a.id) ?? "";
  const normB = index.normalizedHeadlineByArticleId.get(b.id) ?? "";
  if (normA && normB && normA === normB) return true;

  if (titleSimilarity(a.headline, b.headline) >= 0.78) return true;

  const tokenSim = tokenOverlap(
    index.tokensByArticleId.get(a.id) ?? new Set(),
    index.tokensByArticleId.get(b.id) ?? new Set()
  );
  return tokenSim >= 0.55;
}

export function collectClusterSiblingIds(
  article: HomeArticle,
  index: DuplicateIndex
): Set<string> {
  const clusterId = getDuplicateClusterId(article, index);
  if (!clusterId) return new Set();

  const siblings = new Set<string>();
  for (const [id, cid] of index.clusterByArticleId.entries()) {
    if (cid === clusterId && id !== article.id) siblings.add(id);
  }
  return siblings;
}

export function pickClusterRepresentatives(
  articles: HomeArticle[],
  index: DuplicateIndex,
  scoreFn: (a: HomeArticle) => number
): Set<string> {
  const bestByCluster = new Map<string, string>();

  for (const article of articles) {
    const clusterId = getDuplicateClusterId(article, index);
    if (!clusterId) continue;

    const score = scoreFn(article);
    const current = bestByCluster.get(clusterId);
    if (!current) {
      bestByCluster.set(clusterId, article.id);
      continue;
    }
    const currentArticle = articles.find((a) => a.id === current);
    if (!currentArticle || score > scoreFn(currentArticle)) {
      bestByCluster.set(clusterId, article.id);
    }
  }

  return new Set(bestByCluster.values());
}
