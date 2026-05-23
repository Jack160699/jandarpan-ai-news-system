/**
 * Cluster confidence scoring — multi-source merge quality
 */

import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import type { NewsSignalRow } from "@/lib/types/newsroom";

export type ClusterConfidenceInput = {
  signals: NewsSignalRow[];
  avgSimilarity: number;
  mergeReasons?: string[];
};

export type ClusterConfidenceReport = {
  score: number;
  label: "high" | "medium" | "low";
  sourceDiversity: number;
  avgSourceConfidence: number;
  similarityComponent: number;
  recencyComponent: number;
  flags: string[];
};

export function computeClusterConfidence(
  input: ClusterConfidenceInput
): ClusterConfidenceReport {
  const flags: string[] = [];
  const n = input.signals.length;

  if (n === 0) {
    return {
      score: 0,
      label: "low",
      sourceDiversity: 0,
      avgSourceConfidence: 0,
      similarityComponent: 0,
      recencyComponent: 0,
      flags: ["empty_cluster"],
    };
  }

  const providers = new Set(input.signals.map((s) => s.provider));
  const sources = new Set(
    input.signals.map((s) => s.source?.trim()).filter(Boolean)
  );
  const sourceDiversity = Math.min(
    1,
    (providers.size * 0.4 + sources.size * 0.6) / Math.max(3, n)
  );

  const confidences = input.signals.map(scoreSourceConfidence);
  const avgSourceConfidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const similarityComponent = Math.max(0, Math.min(1, input.avgSimilarity));

  const newest = input.signals.reduce((best, s) => {
    const t = s.published_at ? new Date(s.published_at).getTime() : 0;
    return Math.max(best, t);
  }, 0);
  const ageH = newest ? (Date.now() - newest) / 3_600_000 : 72;
  let recencyComponent = 0.35;
  if (ageH < 3) recencyComponent = 1;
  else if (ageH < 12) recencyComponent = 0.85;
  else if (ageH < 24) recencyComponent = 0.65;
  else if (ageH < 48) recencyComponent = 0.45;

  if (n < 2) flags.push("single_source");
  if (providers.size < 2 && n > 1) flags.push("same_provider_only");
  if (input.avgSimilarity < 0.65) flags.push("low_merge_similarity");

  let score =
    similarityComponent * 0.35 +
    sourceDiversity * 0.3 +
    avgSourceConfidence * 0.2 +
    recencyComponent * 0.15;

  if (n >= 3 && providers.size >= 2) score += 0.08;
  if (input.mergeReasons?.includes("title_near_duplicate")) score += 0.04;

  score = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;

  const label: ClusterConfidenceReport["label"] =
    score >= 0.72 ? "high" : score >= 0.48 ? "medium" : "low";

  return {
    score,
    label,
    sourceDiversity,
    avgSourceConfidence,
    similarityComponent,
    recencyComponent,
    flags,
  };
}
