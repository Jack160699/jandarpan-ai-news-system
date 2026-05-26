/**
 * Semantic clustering via embedding cosine similarity (union-find)
 */

import { cosineSimilarity, embedTexts } from "@/lib/intelligence/vector/embeddings";
import type { SimilarMatch } from "@/lib/intelligence/vector/vector-store";

export type SemanticCluster = {
  clusterId: string;
  memberIds: string[];
  centroidTitle: string;
  avgSimilarity: number;
  method: "embedding" | "headline_fallback";
};

export async function clusterByEmbeddings(input: {
  items: Array<{ id: string; text: string }>;
  threshold?: number;
}): Promise<SemanticCluster[]> {
  const threshold = input.threshold ?? 0.82;
  if (input.items.length === 0) return [];

  const embeddings = await embedTexts(input.items.map((i) => i.text));
  const hasEmb = embeddings.some((e) => e != null);

  if (!hasEmb) {
    return input.items.map((item, idx) => ({
      clusterId: `solo-${idx}`,
      memberIds: [item.id],
      centroidTitle: item.text.slice(0, 80),
      avgSimilarity: 1,
      method: "headline_fallback" as const,
    }));
  }

  const parent = input.items.map((_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let i = 0; i < input.items.length; i++) {
    for (let j = i + 1; j < input.items.length; j++) {
      const sim = cosineSimilarity(
        embeddings[i] ?? [],
        embeddings[j] ?? []
      );
      if (sim >= threshold) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < input.items.length; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const clusters: SemanticCluster[] = [];
  let clusterIdx = 0;

  for (const indices of groups.values()) {
    const memberIds = indices.map((i) => input.items[i].id);
    const centroidTitle = input.items[indices[0]].text.slice(0, 120);
    clusters.push({
      clusterId: `sem-${clusterIdx++}`,
      memberIds,
      centroidTitle,
      avgSimilarity: indices.length > 1 ? threshold : 1,
      method: "embedding",
    });
  }

  return clusters.sort((a, b) => b.memberIds.length - a.memberIds.length);
}

export function mergeSemanticDuplicates(
  headlineMatches: SimilarMatch[],
  semanticMatches: SimilarMatch[]
): SimilarMatch[] {
  const map = new Map<string, SimilarMatch>();
  for (const m of [...headlineMatches, ...semanticMatches]) {
    const key = `${m.entityType}:${m.entityId}`;
    const prev = map.get(key);
    if (!prev || m.similarity > prev.similarity) map.set(key, m);
  }
  return [...map.values()].sort((a, b) => b.similarity - a.similarity);
}
