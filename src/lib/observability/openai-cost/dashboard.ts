/**
 * OpenAI usage dashboard — aggregates from openai_usage_events table
 */

import { createAdminServerClient } from "@/lib/supabase";
import type { OpenAiUsageDashboard } from "@/lib/observability/openai-cost/types";
import { detectOptimizationOpportunities } from "@/lib/observability/openai-cost/optimization";

type UsageRow = {
  id: string;
  created_at: string;
  worker: string | null;
  operation: string;
  article_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  retry_count: number;
  prompt_hash: string | null;
  prompt_chars: number | null;
  completion_chars: number | null;
  success: boolean;
};

function startOfDay(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function sumCost(rows: UsageRow[]): number {
  return rows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
}

function groupBy<T>(
  rows: T[],
  keyFn: (r: T) => string | null
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

export async function getOpenAiUsageDashboard(): Promise<OpenAiUsageDashboard> {
  const supabase = createAdminServerClient();
  const todayStart = startOfDay(new Date());
  const yesterdayStart = daysAgo(1);
  const last7Start = daysAgo(7);
  const last30Start = daysAgo(30);

  const { data: rows, error } = await supabase
    .from("openai_usage_events")
    .select(
      "id, created_at, worker, operation, article_id, model, input_tokens, output_tokens, estimated_cost_usd, retry_count, prompt_hash, prompt_chars, completion_chars, success"
    )
    .gte("created_at", last30Start)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !rows?.length) {
    const opportunities = await detectOptimizationOpportunities([]);
    return emptyDashboard(opportunities);
  }

  const all = rows as UsageRow[];
  const today = all.filter((r) => r.created_at >= todayStart);
  const yesterday = all.filter(
    (r) => r.created_at >= yesterdayStart && r.created_at < todayStart
  );
  const last7 = all.filter((r) => r.created_at >= last7Start);

  const workerGroups = groupBy(all, (r) => r.worker ?? "unknown");
  const modelGroups = groupBy(all, (r) => r.model);
  const articleGroups = groupBy(all, (r) => r.article_id);

  const costByWorker = [...workerGroups.entries()]
    .map(([worker, rs]) => ({
      worker,
      costUsd: round(sumCost(rs)),
      requests: rs.length,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const costByModel = [...modelGroups.entries()]
    .map(([model, rs]) => ({
      model,
      costUsd: round(sumCost(rs)),
      requests: rs.length,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const costByArticle = [...articleGroups.entries()]
    .map(([articleId, rs]) => ({
      articleId,
      costUsd: round(sumCost(rs)),
      requests: rs.length,
    }))
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 20);

  const totalInput = all.reduce((s, r) => s + r.input_tokens, 0);
  const totalOutput = all.reduce((s, r) => s + r.output_tokens, 0);

  const largestPromptToday = today.reduce<UsageRow | null>(
    (best, r) =>
      !best || r.input_tokens > best.input_tokens ? r : best,
    null
  );

  const largestCompletionToday = today.reduce<UsageRow | null>(
    (best, r) =>
      !best || r.output_tokens > best.output_tokens ? r : best,
    null
  );

  const retryRows = all.filter((r) => r.retry_count > 0);
  const retryCostUsd = round(sumCost(retryRows));

  const hashGroups = groupBy(
    all.filter((r) => r.prompt_hash),
    (r) => r.prompt_hash
  );
  const duplicateWorkDetected = [...hashGroups.entries()]
    .filter(([, rs]) => rs.length > 1)
    .map(([promptHash, rs]) => ({
      promptHash,
      count: rs.length,
      totalCostUsd: round(sumCost(rs)),
      operations: [...new Set(rs.map((r) => r.operation))],
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .slice(0, 10);

  const topExpensiveRequests = [...all]
    .sort(
      (a, b) =>
        Number(b.estimated_cost_usd) - Number(a.estimated_cost_usd)
    )
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      operation: r.operation,
      worker: r.worker,
      model: r.model,
      articleId: r.article_id,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      estimatedCostUsd: Number(r.estimated_cost_usd),
      createdAt: r.created_at,
      retryCount: r.retry_count,
    }));

  const opportunities = await detectOptimizationOpportunities(all);

  const oldest = all[all.length - 1];

  return {
    todaySpendUsd: round(sumCost(today)),
    yesterdaySpendUsd: round(sumCost(yesterday)),
    last7DaysSpendUsd: round(sumCost(last7)),
    last30DaysSpendUsd: round(sumCost(all)),
    costByWorker,
    costByModel,
    costByArticle,
    avgTokensPerRequest: {
      input: all.length ? Math.round(totalInput / all.length) : 0,
      output: all.length ? Math.round(totalOutput / all.length) : 0,
    },
    largestPromptToday: largestPromptToday
      ? {
          operation: largestPromptToday.operation,
          inputTokens: largestPromptToday.input_tokens,
          promptChars: largestPromptToday.prompt_chars,
          articleId: largestPromptToday.article_id,
          createdAt: largestPromptToday.created_at,
        }
      : null,
    largestCompletionToday: largestCompletionToday
      ? {
          operation: largestCompletionToday.operation,
          outputTokens: largestCompletionToday.output_tokens,
          completionChars: largestCompletionToday.completion_chars,
          articleId: largestCompletionToday.article_id,
          createdAt: largestCompletionToday.created_at,
        }
      : null,
    mostExpensiveArticle: costByArticle[0] ?? null,
    mostExpensiveWorker: costByWorker[0] ?? null,
    retryCostUsd,
    duplicateWorkDetected,
    topExpensiveRequests,
    optimizationOpportunities: opportunities,
    totalRequests: all.length,
    instrumentedSince: oldest?.created_at ?? null,
  };
}

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function emptyDashboard(
  opportunities: OpenAiUsageDashboard["optimizationOpportunities"]
): OpenAiUsageDashboard {
  return {
    todaySpendUsd: 0,
    yesterdaySpendUsd: 0,
    last7DaysSpendUsd: 0,
    last30DaysSpendUsd: 0,
    costByWorker: [],
    costByModel: [],
    costByArticle: [],
    avgTokensPerRequest: { input: 0, output: 0 },
    largestPromptToday: null,
    largestCompletionToday: null,
    mostExpensiveArticle: null,
    mostExpensiveWorker: null,
    retryCostUsd: 0,
    duplicateWorkDetected: [],
    topExpensiveRequests: [],
    optimizationOpportunities: opportunities,
    totalRequests: 0,
    instrumentedSince: null,
  };
}
