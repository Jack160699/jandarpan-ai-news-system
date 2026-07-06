/**
 * Cost optimization opportunity detection from usage patterns
 */

import type { OpenAiUsageDashboard } from "@/lib/observability/openai-cost/types";

type UsageRow = {
  operation: string;
  article_id: string | null;
  prompt_hash: string | null;
  estimated_cost_usd: number;
  retry_count: number;
  input_tokens: number;
  output_tokens: number;
  worker: string | null;
};

export async function detectOptimizationOpportunities(
  rows: UsageRow[]
): Promise<OpenAiUsageDashboard["optimizationOpportunities"]> {
  const opportunities: OpenAiUsageDashboard["optimizationOpportunities"] = [];

  if (!rows.length) {
    opportunities.push({
      id: "awaiting_data",
      category: "instrumentation",
      description:
        "OpenAI cost instrumentation is active. Usage data will populate after the next API calls.",
      estimatedMonthlySavingsUsd: 0,
      evidence: { status: "no_events_yet" },
    });
    return opportunities;
  }

  const dailyCost = sumCost(rows) / Math.max(1, daysSpan(rows));
  const monthlyEstimate = dailyCost * 30;

  // Duplicate prompts (identical prompt_hash)
  const hashGroups = new Map<string, UsageRow[]>();
  for (const r of rows) {
    if (!r.prompt_hash) continue;
    const list = hashGroups.get(r.prompt_hash) ?? [];
    list.push(r);
    hashGroups.set(r.prompt_hash, list);
  }
  const duplicateHashes = [...hashGroups.entries()].filter(
    ([, rs]) => rs.length > 1
  );
  if (duplicateHashes.length > 0) {
    const wasted = duplicateHashes.reduce((s, [, rs]) => {
      const costs = rs.map((r) => Number(r.estimated_cost_usd)).sort((a, b) => b - a);
      return s + costs.slice(1).reduce((a, c) => a + c, 0);
    }, 0);
    opportunities.push({
      id: "duplicate_prompts",
      category: "duplicate_work",
      description: `${duplicateHashes.length} identical prompts regenerated — cache or skip re-generation.`,
      estimatedMonthlySavingsUsd: round(wasted / Math.max(1, daysSpan(rows)) * 30),
      evidence: {
        duplicatePromptCount: duplicateHashes.length,
        wastedCostUsd: round(wasted),
        topOperations: topOps(duplicateHashes.flatMap(([, rs]) => rs)),
      },
    });
  }

  // Per-article multiple editorial/translation calls
  const articleOps = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!r.article_id) continue;
    const ops = articleOps.get(r.article_id) ?? new Map();
    ops.set(r.operation, (ops.get(r.operation) ?? 0) + 1);
    articleOps.set(r.article_id, ops);
  }
  let multiEditorialArticles = 0;
  let multiTranslationArticles = 0;
  for (const [, ops] of articleOps) {
    if ((ops.get("editorial_generate") ?? 0) > 1) multiEditorialArticles++;
    if ((ops.get("translation") ?? 0) > 1) multiTranslationArticles++;
  }
  if (multiEditorialArticles > 0) {
    opportunities.push({
      id: "multi_editorial_per_article",
      category: "duplicate_work",
      description: `${multiEditorialArticles} articles received multiple editorial_generate calls (repair/retry overlap).`,
      estimatedMonthlySavingsUsd: round(monthlyEstimate * 0.08),
      evidence: { articleCount: multiEditorialArticles },
    });
  }
  if (multiTranslationArticles > 0) {
    opportunities.push({
      id: "multi_translation_per_article",
      category: "duplicate_work",
      description: `${multiTranslationArticles} articles re-translated — check translation queue idempotency.`,
      estimatedMonthlySavingsUsd: round(monthlyEstimate * 0.12),
      evidence: { articleCount: multiTranslationArticles },
    });
  }

  // Retry cost
  const retryRows = rows.filter((r) => r.retry_count > 0);
  const retryCost = sumCost(retryRows);
  if (retryCost > 0) {
    opportunities.push({
      id: "retry_cost",
      category: "retries",
      description: `${retryRows.length} retried requests cost $${round(retryCost)} — tighten transient retry policy or fix upstream failures.`,
      estimatedMonthlySavingsUsd: round(retryCost / Math.max(1, daysSpan(rows)) * 30 * 0.7),
      evidence: { retryCount: retryRows.length, retryCostUsd: round(retryCost) },
    });
  }

  // Large prompts (translation)
  const translationRows = rows.filter((r) => r.operation === "translation");
  const avgTranslationInput =
    translationRows.length > 0
      ? translationRows.reduce((s, r) => s + r.input_tokens, 0) /
        translationRows.length
      : 0;
  if (avgTranslationInput > 3000) {
    opportunities.push({
      id: "oversized_translation_prompts",
      category: "prompt_size",
      description: `Translation prompts average ${Math.round(avgTranslationInput)} input tokens — trim article_body slice (currently 12,000 chars).`,
      estimatedMonthlySavingsUsd: round(monthlyEstimate * 0.25),
      evidence: {
        avgInputTokens: Math.round(avgTranslationInput),
        translationRequests: translationRows.length,
        currentBodySlice: 12000,
      },
    });
  }

  // Translation fan-out
  const translationByArticle = new Map<string, number>();
  for (const r of translationRows) {
    if (!r.article_id) continue;
    translationByArticle.set(
      r.article_id,
      (translationByArticle.get(r.article_id) ?? 0) + 1
    );
  }
  const avgLangsPerArticle =
    translationByArticle.size > 0
      ? [...translationByArticle.values()].reduce((a, b) => a + b, 0) /
        translationByArticle.size
      : 0;
  if (avgLangsPerArticle >= 3) {
    opportunities.push({
      id: "translation_fanout",
      category: "translation",
      description: `Average ${avgLangsPerArticle.toFixed(1)} translation calls per article — reduce NEWSROOM_TRANSLATE_LANGS or translate on-demand only.`,
      estimatedMonthlySavingsUsd: round(monthlyEstimate * 0.35),
      evidence: {
        avgLanguagesPerArticle: avgLangsPerArticle,
        defaultTargets: ["en", "cg", "mr", "bn", "ta"],
      },
    });
  }

  // Borderline repair extra calls
  const repairRows = rows.filter((r) => r.operation === "editorial_repair");
  if (repairRows.length > 0) {
    const repairCost = sumCost(repairRows);
    opportunities.push({
      id: "borderline_repair",
      category: "duplicate_work",
      description: `${repairRows.length} borderline editorial repair calls — each article may get 2 LLM calls (generate + repair).`,
      estimatedMonthlySavingsUsd: round(repairCost / Math.max(1, daysSpan(rows)) * 30),
      evidence: { repairCalls: repairRows.length, repairCostUsd: round(repairCost) },
    });
  }

  // Large fact-pack editorial prompts
  const editorialRows = rows.filter((r) => r.operation === "editorial_generate");
  const avgEditorialInput =
    editorialRows.length > 0
      ? editorialRows.reduce((s, r) => s + r.input_tokens, 0) / editorialRows.length
      : 0;
  if (avgEditorialInput > 2500) {
    opportunities.push({
      id: "large_fact_packs",
      category: "prompt_size",
      description: `Editorial fact-packs average ${Math.round(avgEditorialInput)} input tokens — reduce signal excerpts (EXCERPT_MAX=420) or cluster context.`,
      estimatedMonthlySavingsUsd: round(monthlyEstimate * 0.15),
      evidence: {
        avgInputTokens: Math.round(avgEditorialInput),
        excerptMaxChars: 420,
      },
    });
  }

  return opportunities.sort(
    (a, b) => b.estimatedMonthlySavingsUsd - a.estimatedMonthlySavingsUsd
  );
}

function sumCost(rows: UsageRow[]): number {
  return rows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
}

function daysSpan(rows: UsageRow[]): number {
  return Math.max(1, Math.ceil(rows.length / 50));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function topOps(rows: UsageRow[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.operation, (counts.get(r.operation) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([op]) => op);
}
