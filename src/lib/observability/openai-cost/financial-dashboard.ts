/**
 * AI Financial Dashboard — USD + INR, forecasts, budget, optimization report
 */

import { createAdminServerClient } from "@/lib/supabase";
import {
  getExchangeRate,
  toDualCurrency,
  type DualCurrency,
} from "@/lib/observability/openai-cost/currency";
import { getOpenAiUsageDashboard } from "@/lib/observability/openai-cost/dashboard";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { countPendingEditorialImages } from "@/lib/news/ai/generate-editorial-image";

export type MoneyAmount = DualCurrency & {
  usdLabel: string;
  inrLabel: string;
};

export type AiFinancialDashboard = {
  exchangeRate: number;
  spend: {
    today: MoneyAmount;
    yesterday: MoneyAmount;
    last7Days: MoneyAmount;
    last30Days: MoneyAmount;
    currentMonth: MoneyAmount;
    projectedMonthly: MoneyAmount;
    projectedYearly: MoneyAmount;
  };
  costByWorker: Array<{
    worker: string;
    label: string;
    cost: MoneyAmount;
    requests: number;
  }>;
  costByModel: Array<{
    model: string;
    cost: MoneyAmount;
    requests: number;
  }>;
  articlesToday: {
    count: number;
    avgCostPerArticle: MoneyAmount;
    medianCostPerArticle: MoneyAmount;
    highest: { articleId: string; title: string; cost: MoneyAmount } | null;
    lowest: { articleId: string; title: string; cost: MoneyAmount } | null;
  };
  topExpensiveArticles: Array<{
    articleId: string;
    title: string;
    worker: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: MoneyAmount;
    requests: number;
  }>;
  cache: {
    hits: number;
    misses: number;
    saved: MoneyAmount;
  };
  repair: {
    skipped: number;
    estimatedSaved: MoneyAmount;
  };
  retries: {
    count: number;
    cost: MoneyAmount;
  };
  duplicates: {
    prevented: number;
    estimatedSaved: MoneyAmount;
    detected: Array<{
      promptHash: string;
      count: number;
      saved: MoneyAmount;
      operations: string[];
    }>;
  };
  budget: {
    monthlyLimitUsd: number;
    monthlyLimit: MoneyAmount;
    currentSpend: MoneyAmount;
    percentUsed: number;
    forecast: MoneyAmount;
    daysRemaining: number;
    burnRatePerDay: MoneyAmount;
    warnings: Array<"50" | "75" | "90" | "100">;
  };
  forecast: {
    burnPerDay: MoneyAmount;
    projectedMonth: MoneyAmount;
    projectedYear: MoneyAmount;
    backlogAiQueueCost: MoneyAmount;
    backlogEditorialImagesCost: MoneyAmount;
  };
  optimizationReport: {
    topCostDrivers: Array<{ name: string; cost: MoneyAmount; sharePct: number }>;
    biggestPrompts: Array<{ operation: string; inputTokens: number; cost: MoneyAmount }>;
    largestOutputs: Array<{ operation: string; outputTokens: number; cost: MoneyAmount }>;
    topWorkersBySpend: Array<{ worker: string; label: string; cost: MoneyAmount }>;
    topModelsBySpend: Array<{ model: string; cost: MoneyAmount }>;
    topRetryCosts: MoneyAmount;
    topDuplicateCosts: MoneyAmount;
  };
  tokens: {
    avgInputPerRequest: number;
    avgOutputPerRequest: number;
    avgInputPerArticle: number;
    avgOutputPerArticle: number;
  };
  successMetrics: {
    targetCostReductionPct: string;
    targetInputTokenReductionPct: string;
    targetOutputTokenReductionPct: string;
    targetDuplicateReductionPct: string;
  };
  instrumentedSince: string | null;
  totalRequests: number;
};

const WORKER_LABELS: Record<string, string> = {
  ai_enrich: "AI Enrichment",
  editorial_generate: "Editorial",
  editorial_repair: "Repair",
  translation: "Translation",
  intelligence_embed: "Embeddings",
  shorts: "Shorts",
  shorts_voice: "Voice",
  editorial_images: "Images",
  editor_ai: "Editor AI",
  dam_analyze: "DAM Vision",
  event_cluster: "Clustering",
  admin_regenerate: "Regenerate",
  unknown: "Other",
};

function money(usd: number, rate: number): MoneyAmount {
  const dual = toDualCurrency(usd, rate);
  return {
    ...dual,
    usdLabel: `$${dual.usd.toFixed(usd >= 1 ? 2 : 4)}`,
    inrLabel: `₹${dual.inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function startOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function daysRemainingInMonth(d: Date): number {
  return daysInMonth(d) - d.getDate() + 1;
}

export async function getAiFinancialDashboard(): Promise<AiFinancialDashboard> {
  const rate = getExchangeRate();
  const base = await getOpenAiUsageDashboard();
  const supabase = createAdminServerClient();

  const monthStart = startOfMonth(new Date());
  const { data: monthRows } = await supabase
    .from("openai_usage_events")
    .select(
      "estimated_cost_usd, input_tokens, output_tokens, worker, operation, model, article_id, prompt_hash, retry_count, success, metadata, created_at"
    )
    .gte("created_at", monthStart)
    .limit(5000);

  const monthSpendUsd = (monthRows ?? []).reduce(
    (s, r) => s + Number(r.estimated_cost_usd),
    0
  );

  const burn7 = base.last7DaysSpendUsd / 7;
  const projectedMonthly = burn7 * daysInMonth(new Date());
  const projectedYearly = burn7 * 365;

  const articleIds = base.costByArticle.map((a) => a.articleId).slice(0, 25);
  const titleMap = new Map<string, string>();
  if (articleIds.length) {
    const { data: articles } = await supabase
      .from("generated_articles")
      .select("id, headline")
      .in("id", articleIds);
    for (const a of articles ?? []) {
      titleMap.set(a.id, a.headline);
    }
  }

  const todayArticleCosts = base.costByArticle;
  const todayArticleCount = todayArticleCosts.length;
  const costs = todayArticleCosts.map((a) => a.costUsd);
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  const medCost = median(costs);

  const highest = base.mostExpensiveArticle
    ? {
        articleId: base.mostExpensiveArticle.articleId,
        title: titleMap.get(base.mostExpensiveArticle.articleId) ?? "Unknown",
        cost: money(base.mostExpensiveArticle.costUsd, rate),
      }
    : null;

  const lowestEntry = [...todayArticleCosts].sort((a, b) => a.costUsd - b.costUsd)[0];
  const lowest = lowestEntry
    ? {
        articleId: lowestEntry.articleId,
        title: titleMap.get(lowestEntry.articleId) ?? "Unknown",
        cost: money(lowestEntry.costUsd, rate),
      }
    : null;

  let cacheHits = 0;
  let cacheMisses = 0;
  let cacheSavedUsd = 0;
  let repairSkipped = 0;
  let repairSavedUsd = 0;

  for (const row of monthRows ?? []) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    if (meta.cacheHit === true) {
      cacheHits++;
      cacheSavedUsd += Number(meta.savedCostUsd ?? 0);
    } else {
      cacheMisses++;
    }
    if (meta.repairSkipped === true) {
      repairSkipped++;
      repairSavedUsd += Number(meta.repairSavedUsd ?? 0.002);
    }
  }

  const duplicateSavedUsd = base.duplicateWorkDetected.reduce((s, d) => {
    const costs = d.totalCostUsd;
    return s + costs * 0.5;
  }, 0);

  const monthlyBudgetUsd = Number(process.env.OPENAI_MONTHLY_BUDGET_USD) || 50;
  const percentUsed = monthlyBudgetUsd > 0 ? (monthSpendUsd / monthlyBudgetUsd) * 100 : 0;
  const warnings: Array<"50" | "75" | "90" | "100"> = [];
  if (percentUsed >= 50) warnings.push("50");
  if (percentUsed >= 75) warnings.push("75");
  if (percentUsed >= 90) warnings.push("90");
  if (percentUsed >= 100) warnings.push("100");

  const [aiPending, imagePending] = await Promise.all([
    countPendingAiQueue().catch(() => 0),
    countPendingEditorialImages().catch(() => 0),
  ]);

  const avgEnrichCost = 0.00012;
  const avgImageCost = 0.08;
  const backlogAiCost = aiPending * avgEnrichCost;
  const backlogImageCost = imagePending * avgImageCost;

  const articleRows = (monthRows ?? []).filter((r) => r.article_id);
  const articleGroups = new Map<string, { input: number; output: number }>();
  for (const r of articleRows) {
    const id = r.article_id!;
    const g = articleGroups.get(id) ?? { input: 0, output: 0 };
    g.input += r.input_tokens;
    g.output += r.output_tokens;
    articleGroups.set(id, g);
  }
  const articleTokenList = [...articleGroups.values()];

  const topDrivers = base.costByWorker.slice(0, 5).map((w) => ({
    name: WORKER_LABELS[w.worker] ?? w.worker,
    cost: money(w.costUsd, rate),
    sharePct:
      base.last30DaysSpendUsd > 0
        ? Math.round((w.costUsd / base.last30DaysSpendUsd) * 1000) / 10
        : 0,
  }));

  return {
    exchangeRate: rate,
    spend: {
      today: money(base.todaySpendUsd, rate),
      yesterday: money(base.yesterdaySpendUsd, rate),
      last7Days: money(base.last7DaysSpendUsd, rate),
      last30Days: money(base.last30DaysSpendUsd, rate),
      currentMonth: money(monthSpendUsd, rate),
      projectedMonthly: money(projectedMonthly, rate),
      projectedYearly: money(projectedYearly, rate),
    },
    costByWorker: base.costByWorker.map((w) => ({
      worker: w.worker,
      label: WORKER_LABELS[w.worker] ?? w.worker,
      cost: money(w.costUsd, rate),
      requests: w.requests,
    })),
    costByModel: base.costByModel.map((m) => ({
      model: m.model,
      cost: money(m.costUsd, rate),
      requests: m.requests,
    })),
    articlesToday: {
      count: todayArticleCount,
      avgCostPerArticle: money(avgCost, rate),
      medianCostPerArticle: money(medCost, rate),
      highest,
      lowest,
    },
    topExpensiveArticles: base.costByArticle.map((a) => {
      const reqs = base.topExpensiveRequests.filter((r) => r.articleId === a.articleId);
      const top = reqs[0];
      return {
        articleId: a.articleId,
        title: titleMap.get(a.articleId) ?? `Article ${a.articleId.slice(0, 8)}`,
        worker: top?.worker ?? "mixed",
        model: top?.model ?? "gpt-4o-mini",
        inputTokens: reqs.reduce((s, r) => s + r.inputTokens, 0),
        outputTokens: reqs.reduce((s, r) => s + r.outputTokens, 0),
        cost: money(a.costUsd, rate),
        requests: a.requests,
      };
    }),
    cache: {
      hits: cacheHits,
      misses: cacheMisses,
      saved: money(cacheSavedUsd, rate),
    },
    repair: {
      skipped: repairSkipped,
      estimatedSaved: money(repairSavedUsd, rate),
    },
    retries: {
      count: (monthRows ?? []).filter((r) => r.retry_count > 0).length,
      cost: money(base.retryCostUsd, rate),
    },
    duplicates: {
      prevented: base.duplicateWorkDetected.length,
      estimatedSaved: money(duplicateSavedUsd, rate),
      detected: base.duplicateWorkDetected.map((d) => ({
        promptHash: d.promptHash,
        count: d.count,
        saved: money(d.totalCostUsd * 0.5, rate),
        operations: d.operations,
      })),
    },
    budget: {
      monthlyLimitUsd: monthlyBudgetUsd,
      monthlyLimit: money(monthlyBudgetUsd, rate),
      currentSpend: money(monthSpendUsd, rate),
      percentUsed: Math.round(percentUsed * 10) / 10,
      forecast: money(projectedMonthly, rate),
      daysRemaining: daysRemainingInMonth(new Date()),
      burnRatePerDay: money(burn7, rate),
      warnings,
    },
    forecast: {
      burnPerDay: money(burn7, rate),
      projectedMonth: money(projectedMonthly, rate),
      projectedYear: money(projectedYearly, rate),
      backlogAiQueueCost: money(backlogAiCost, rate),
      backlogEditorialImagesCost: money(backlogImageCost, rate),
    },
    optimizationReport: {
      topCostDrivers: topDrivers,
      biggestPrompts: base.topExpensiveRequests
        .sort((a, b) => b.inputTokens - a.inputTokens)
        .slice(0, 5)
        .map((r) => ({
          operation: r.operation,
          inputTokens: r.inputTokens,
          cost: money(r.estimatedCostUsd, rate),
        })),
      largestOutputs: base.topExpensiveRequests
        .sort((a, b) => b.outputTokens - a.outputTokens)
        .slice(0, 5)
        .map((r) => ({
          operation: r.operation,
          outputTokens: r.outputTokens,
          cost: money(r.estimatedCostUsd, rate),
        })),
      topWorkersBySpend: base.costByWorker.slice(0, 5).map((w) => ({
        worker: w.worker,
        label: WORKER_LABELS[w.worker] ?? w.worker,
        cost: money(w.costUsd, rate),
      })),
      topModelsBySpend: base.costByModel.slice(0, 5).map((m) => ({
        model: m.model,
        cost: money(m.costUsd, rate),
      })),
      topRetryCosts: money(base.retryCostUsd, rate),
      topDuplicateCosts: money(duplicateSavedUsd, rate),
    },
    tokens: {
      avgInputPerRequest: base.avgTokensPerRequest.input,
      avgOutputPerRequest: base.avgTokensPerRequest.output,
      avgInputPerArticle: articleTokenList.length
        ? Math.round(
            articleTokenList.reduce((s, a) => s + a.input, 0) / articleTokenList.length
          )
        : 0,
      avgOutputPerArticle: articleTokenList.length
        ? Math.round(
            articleTokenList.reduce((s, a) => s + a.output, 0) / articleTokenList.length
          )
        : 0,
    },
    successMetrics: {
      targetCostReductionPct: "30–60%",
      targetInputTokenReductionPct: "20%",
      targetOutputTokenReductionPct: "25%",
      targetDuplicateReductionPct: "50%",
    },
    instrumentedSince: base.instrumentedSince,
    totalRequests: base.totalRequests,
  };
}
