/**
 * Executive AI CFO Dashboard — aggregates existing observability without duplicate instrumentation.
 */

import { createAdminServerClient } from "@/lib/supabase";
import {
  getAiFinancialDashboard,
  getOpenAiUsageDashboard,
  type MoneyAmount,
} from "@/lib/observability/openai-cost";
import { getExchangeRate, formatDualCurrency } from "@/lib/observability/openai-cost/currency";
import { getQueueAnalyticsDashboard } from "@/lib/observability/queue-analytics";

export type ExecutiveDashboard = {
  exchangeRate: number;
  generatedAt: string;
  overview: {
    todaySpend: MoneyAmount;
    monthlySpend: MoneyAmount;
    budgetRemaining: MoneyAmount;
    moneySaved: MoneyAmount;
  };
  profitability: {
    todayAiCost: MoneyAmount;
    todayRevenue: MoneyAmount | null;
    todayProfit: MoneyAmount | null;
    monthlyProfit: MoneyAmount | null;
    yearlyProjection: MoneyAmount;
    breakEvenCost: MoneyAmount;
    roi: number | null;
    costPerPublishedArticle: MoneyAmount;
    costPerVisitor: MoneyAmount | null;
    costPerSession: MoneyAmount | null;
    costPer100Articles: MoneyAmount;
    costPer1000Articles: MoneyAmount;
    revenueAvailable: boolean;
  };
  businessKpis: {
    publishedToday: number;
    generatedToday: number;
    translatedToday: number;
    imagesGeneratedToday: number;
    queueSize: number;
    avgCostPerArticle: MoneyAmount;
    avgTokensPerArticle: number;
    avgLatencyMs: number;
    avgQualityScore: number | null;
    avgCacheHitRate: number;
  };
  budgetSimulator: {
    presets: number[];
    selectedBudgetUsd: number;
    scenarios: Array<{
      budgetUsd: number;
      budget: MoneyAmount;
      articlesPossible: number;
      queueGrowthDays: number | null;
      monthlyBurn: MoneyAmount;
      yearlyBurn: MoneyAmount;
    }>;
  };
  queueEconomics: {
    currentQueue: number;
    estimatedClearCost: MoneyAmount;
    estimatedRuntime: string;
    estimatedApiCalls: number;
    estimatedTokens: number;
  };
  growthForecast: Array<{
    articlesPerDay: number;
    monthlyBill: MoneyAmount;
    yearlyBill: MoneyAmount;
    infrastructureEstimate: MoneyAmount;
  }>;
  workerFinancials: Array<{
    worker: string;
    label: string;
    cost: MoneyAmount;
    tokens: number;
    avgLatencyMs: number;
    retries: number;
    cacheHits: number;
    savings: MoneyAmount;
    roi: number;
  }>;
  languageAnalytics: Array<{
    language: string;
    label: string;
    articles: number;
    tokens: number;
    spend: MoneyAmount;
    savings: MoneyAmount;
  }>;
  districtAnalytics: Array<{
    district: string;
    spend: MoneyAmount;
    articles: number;
    avgQuality: number | null;
  }>;
  modelAnalytics: Array<{
    model: string;
    spend: MoneyAmount;
    tokens: number;
    avgLatencyMs: number;
    successRate: number;
    cachePct: number;
  }>;
  efficiencyScore: {
    overall: number;
    breakdown: {
      prompt: number;
      cache: number;
      retry: number;
      queue: number;
      translation: number;
      editorial: number;
      worker: number;
    };
  };
  savings: {
    today: MoneyAmount;
    thisMonth: MoneyAmount;
    byCache: MoneyAmount;
    byRetries: MoneyAmount;
    byOptimization: MoneyAmount;
    byPromptTrimming: MoneyAmount;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    potentialSavings: MoneyAmount;
    priority: "high" | "medium" | "low";
  }>;
  anomalies: Array<{
    id: string;
    type: string;
    severity: "critical" | "warning" | "info";
    message: string;
    timestamp: string;
    value?: number;
  }>;
  alerts: {
    budget: Array<{ threshold: "50" | "75" | "90" | "100"; triggered: boolean; message: string }>;
    queue: { triggered: boolean; message: string };
    cost: { triggered: boolean; message: string };
    worker: { triggered: boolean; message: string };
    openai: { triggered: boolean; message: string };
  };
  trends: {
    cost: Array<{ date: string; usd: number; inr: number }>;
    tokens: Array<{ date: string; input: number; output: number }>;
    queue: Array<{ date: string; pending: number }>;
    savings: Array<{ date: string; usd: number }>;
    forecast: Array<{ date: string; projectedUsd: number }>;
    roi: Array<{ date: string; roi: number | null }>;
  };
  reports: {
    available: Array<"daily" | "weekly" | "monthly" | "quarterly">;
    exportFormats: Array<"pdf" | "csv" | "json">;
  };
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

const LANGUAGE_LABELS: Record<string, string> = {
  hi: "Hindi",
  en: "English",
  cg: "Chhattisgarhi",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
};

const BUDGET_PRESETS = [25, 50, 100, 250, 500];
const GROWTH_SCENARIOS = [100, 250, 500, 1000];

function money(usd: number, rate: number): MoneyAmount {
  const f = formatDualCurrency(usd, rate);
  return { usd: f.dual.usd, inr: f.dual.inr, usdLabel: f.usdLabel, inrLabel: f.inrLabel };
}

function startOfDay(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function startOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

type UsageRow = {
  created_at: string;
  worker: string | null;
  operation: string;
  article_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number | null;
  retry_count: number;
  success: boolean;
  metadata: Record<string, unknown>;
};

export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const rate = getExchangeRate();
  const [financial, usage, queue, monthRows, todayArticles, readerStats] =
    await Promise.all([
      getAiFinancialDashboard(),
      getOpenAiUsageDashboard(),
      getQueueAnalyticsDashboard(),
      fetchMonthUsageRows(),
      fetchTodayArticleStats(),
      fetchReaderStatsToday(),
    ]);

  const totalSavedUsd =
    financial.cache.saved.usd +
    financial.repair.estimatedSaved.usd +
    financial.duplicates.estimatedSaved.usd;

  const budgetRemainingUsd = Math.max(
    0,
    financial.budget.monthlyLimitUsd - financial.budget.currentSpend.usd
  );

  const avgArticleCost = financial.articlesToday.avgCostPerArticle.usd || 0.00012;
  const avgCostPer100 = avgArticleCost * 100;
  const avgCostPer1000 = avgArticleCost * 1000;

  const publishedCount = Math.max(todayArticles.published, 1);
  const costPerPublished =
    publishedCount > 0 ? financial.spend.today.usd / publishedCount : financial.spend.today.usd;

  const revenueAvailable = readerStats.revenueUsd != null;
  const todayRevenue = revenueAvailable
    ? money(readerStats.revenueUsd!, rate)
    : null;
  const todayProfit = todayRevenue
    ? money(todayRevenue.usd - financial.spend.today.usd, rate)
    : null;
  const monthlyProfit = todayRevenue
    ? money(todayRevenue.usd * 30 - financial.spend.currentMonth.usd, rate)
    : null;

  const breakEvenUsd = financial.budget.monthlyLimitUsd;
  const roi =
    todayRevenue && todayRevenue.usd > 0
      ? Math.round(
          ((todayRevenue.usd - financial.spend.today.usd) / financial.spend.today.usd) * 1000
        ) / 10
      : null;

  const cacheTotal = financial.cache.hits + financial.cache.misses;
  const cacheHitRate = cacheTotal > 0 ? financial.cache.hits / cacheTotal : 0;

  const latencies = monthRows.filter((r) => r.latency_ms).map((r) => r.latency_ms!);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

  const totalTokensMonth = monthRows.reduce(
    (s, r) => s + r.input_tokens + r.output_tokens,
    0
  );
  const articleIds = new Set(monthRows.map((r) => r.article_id).filter(Boolean));
  const avgTokensPerArticle =
    articleIds.size > 0 ? Math.round(totalTokensMonth / articleIds.size) : 0;

  const todayStart = startOfDay(new Date());
  const translatedToday = monthRows.filter(
    (r) => r.created_at >= todayStart && r.worker === "translation"
  ).length;
  const imagesToday = monthRows.filter(
    (r) => r.created_at >= todayStart && r.worker === "editorial_images"
  ).length;

  const currentQueue =
    queue.ai.pending + queue.editorial.pending + queue.editorial.processing;
  const avgEnrichCost = 0.00012;
  const avgImageCost = 0.08;
  const queueClearCost =
    queue.ai.pending * avgEnrichCost + queue.editorial.pending * avgImageCost;
  const queueEta =
    queue.ai.eta.etaLabel !== "—"
      ? queue.ai.eta.etaLabel
      : queue.editorial.eta.etaLabel;
  const estApiCalls = queue.ai.pending + queue.editorial.pending;
  const estTokens = estApiCalls * (financial.tokens.avgInputPerRequest + financial.tokens.avgOutputPerRequest);

  const avgDailyArticles = Math.max(todayArticles.generated, financial.articlesToday.count, 1);
  const costPerArticleDay = financial.spend.today.usd / Math.max(avgDailyArticles, 1);

  const budgetScenarios = BUDGET_PRESETS.map((budgetUsd) => {
    const articlesPossible = costPerArticleDay > 0 ? Math.floor(budgetUsd / (costPerArticleDay * 30)) : 0;
    const monthlyBurn = budgetUsd;
    const drainPerDay = queue.ai.drainPerHour * 24 + queue.editorial.drainPerHour * 24;
    const queueGrowthDays =
      drainPerDay > 0 && currentQueue > 0
        ? Math.round((currentQueue / drainPerDay) * 10) / 10
        : null;
    return {
      budgetUsd,
      budget: money(budgetUsd, rate),
      articlesPossible,
      queueGrowthDays,
      monthlyBurn: money(monthlyBurn, rate),
      yearlyBurn: money(budgetUsd * 12, rate),
    };
  });

  const growthForecast = GROWTH_SCENARIOS.map((apd) => {
    const dailyCost = costPerArticleDay * apd;
    const infraMultiplier = 1 + apd / 5000;
    return {
      articlesPerDay: apd,
      monthlyBill: money(dailyCost * 30, rate),
      yearlyBill: money(dailyCost * 365, rate),
      infrastructureEstimate: money(dailyCost * 30 * infraMultiplier * 0.15, rate),
    };
  });

  const workerFinancials = buildWorkerFinancials(monthRows, rate);
  const languageAnalytics = await buildLanguageAnalytics(monthRows, rate);
  const districtAnalytics = await buildDistrictAnalytics(monthRows, rate);
  const modelAnalytics = buildModelAnalytics(monthRows, rate);
  const efficiencyScore = computeEfficiency(financial, queue, monthRows, cacheHitRate);
  const savings = buildSavings(financial, rate, monthRows, todayStart);
  const recommendations = buildRecommendations(usage, financial, rate);
  const anomalies = detectAnomalies(financial, usage, queue, monthRows);
  const alerts = buildAlerts(financial, queue, usage);
  const trends = buildTrends(monthRows, rate, financial, currentQueue);

  const costPerVisitor =
    readerStats.visitors > 0 ? money(financial.spend.today.usd / readerStats.visitors, rate) : null;
  const costPerSession =
    readerStats.sessions > 0 ? money(financial.spend.today.usd / readerStats.sessions, rate) : null;

  return {
    exchangeRate: rate,
    generatedAt: new Date().toISOString(),
    overview: {
      todaySpend: financial.spend.today,
      monthlySpend: financial.spend.currentMonth,
      budgetRemaining: money(budgetRemainingUsd, rate),
      moneySaved: money(totalSavedUsd, rate),
    },
    profitability: {
      todayAiCost: financial.spend.today,
      todayRevenue,
      todayProfit,
      monthlyProfit,
      yearlyProjection: financial.spend.projectedYearly,
      breakEvenCost: money(breakEvenUsd, rate),
      roi,
      costPerPublishedArticle: money(costPerPublished, rate),
      costPerVisitor,
      costPerSession,
      costPer100Articles: money(avgCostPer100, rate),
      costPer1000Articles: money(avgCostPer1000, rate),
      revenueAvailable,
    },
    businessKpis: {
      publishedToday: todayArticles.published,
      generatedToday: todayArticles.generated,
      translatedToday,
      imagesGeneratedToday: imagesToday,
      queueSize: currentQueue,
      avgCostPerArticle: financial.articlesToday.avgCostPerArticle,
      avgTokensPerArticle,
      avgLatencyMs: avgLatency,
      avgQualityScore: todayArticles.avgQuality,
      avgCacheHitRate: Math.round(cacheHitRate * 1000) / 10,
    },
    budgetSimulator: {
      presets: BUDGET_PRESETS,
      selectedBudgetUsd: financial.budget.monthlyLimitUsd,
      scenarios: budgetScenarios,
    },
    queueEconomics: {
      currentQueue,
      estimatedClearCost: money(queueClearCost, rate),
      estimatedRuntime: queueEta,
      estimatedApiCalls: estApiCalls,
      estimatedTokens: estTokens,
    },
    growthForecast,
    workerFinancials,
    languageAnalytics,
    districtAnalytics,
    modelAnalytics,
    efficiencyScore,
    savings,
    recommendations,
    anomalies,
    alerts,
    trends,
    reports: {
      available: ["daily", "weekly", "monthly", "quarterly"],
      exportFormats: ["pdf", "csv", "json"],
    },
  };
}

async function fetchMonthUsageRows(): Promise<UsageRow[]> {
  const supabase = createAdminServerClient();
  const monthStart = startOfMonth(new Date());
  const { data } = await supabase
    .from("openai_usage_events")
    .select(
      "created_at, worker, operation, article_id, model, input_tokens, output_tokens, cached_tokens, estimated_cost_usd, latency_ms, retry_count, success, metadata"
    )
    .gte("created_at", monthStart)
    .limit(5000);
  return (data ?? []).map((r) => ({
    ...r,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  }));
}

async function fetchTodayArticleStats(): Promise<{
  published: number;
  generated: number;
  avgQuality: number | null;
}> {
  const supabase = createAdminServerClient();
  const todayStart = startOfDay(new Date());
  const [publishedRes, generatedRes, qualityRes] = await Promise.all([
    supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .gte("published_at", todayStart)
      .eq("editorial_status", "published"),
    supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("editorial_image_generations")
      .select("quality_score")
      .gte("created_at", todayStart)
      .not("quality_score", "is", null)
      .limit(200),
  ]);
  const scores = (qualityRes.data ?? [])
    .map((r) => Number(r.quality_score))
    .filter((n) => Number.isFinite(n));
  return {
    published: publishedRes.count ?? 0,
    generated: generatedRes.count ?? 0,
    avgQuality:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null,
  };
}

async function fetchReaderStatsToday(): Promise<{
  visitors: number;
  sessions: number;
  revenueUsd: number | null;
}> {
  const supabase = createAdminServerClient();
  const todayStart = startOfDay(new Date());
  const { data } = await supabase
    .from("reader_analytics_events")
    .select("session_hash, event_type")
    .gte("created_at", todayStart)
    .limit(5000);
  const events = data ?? [];
  const sessions = new Set(events.map((e) => e.session_hash).filter(Boolean)).size;
  const views = events.filter((e) => e.event_type === "article_view").length;
  return { visitors: views, sessions, revenueUsd: null };
}

function buildWorkerFinancials(rows: UsageRow[], rate: number) {
  const groups = new Map<string, UsageRow[]>();
  for (const r of rows) {
    const w = r.worker ?? "unknown";
    const list = groups.get(w) ?? [];
    list.push(r);
    groups.set(w, list);
  }

  return [...groups.entries()]
    .map(([worker, rs]) => {
      const costUsd = rs.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
      const tokens = rs.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);
      const latencies = rs.filter((r) => r.latency_ms).map((r) => r.latency_ms!);
      const avgLat = latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
      const retries = rs.filter((r) => r.retry_count > 0).length;
      const cacheHits = rs.filter((r) => r.metadata.cacheHit === true).length;
      const savedUsd = rs.reduce(
        (s, r) => s + Number(r.metadata.savedCostUsd ?? 0),
        0
      );
      const successRate = rs.length ? rs.filter((r) => r.success).length / rs.length : 1;
      const roi = savedUsd > 0 ? Math.round((savedUsd / Math.max(costUsd, 0.0001)) * 100) : 0;
      return {
        worker,
        label: WORKER_LABELS[worker] ?? worker,
        cost: money(costUsd, rate),
        tokens,
        avgLatencyMs: avgLat,
        retries,
        cacheHits,
        savings: money(savedUsd, rate),
        roi: Math.round(roi * successRate),
      };
    })
    .sort((a, b) => b.cost.usd - a.cost.usd)
    .slice(0, 12);
}

async function buildLanguageAnalytics(rows: UsageRow[], rate: number) {
  const supabase = createAdminServerClient();
  const articleIds = [...new Set(rows.map((r) => r.article_id).filter(Boolean))] as string[];
  const langMap = new Map<string, string>();
  if (articleIds.length) {
    const { data } = await supabase
      .from("generated_articles")
      .select("id, language")
      .in("id", articleIds.slice(0, 500));
    for (const a of data ?? []) {
      if (a.language) langMap.set(a.id, a.language);
    }
  }

  const groups = new Map<string, { articles: Set<string>; tokens: number; spend: number; saved: number }>();
  for (const r of rows) {
    let lang = "other";
    if (r.worker === "translation" && r.metadata.targetLang) {
      lang = String(r.metadata.targetLang);
    } else if (r.article_id && langMap.has(r.article_id)) {
      lang = langMap.get(r.article_id)!;
    } else if (r.article_id) {
      lang = "other";
    } else {
      continue;
    }
    const g = groups.get(lang) ?? { articles: new Set(), tokens: 0, spend: 0, saved: 0 };
    if (r.article_id) g.articles.add(r.article_id);
    g.tokens += r.input_tokens + r.output_tokens;
    g.spend += Number(r.estimated_cost_usd);
    g.saved += Number(r.metadata.savedCostUsd ?? 0);
    groups.set(lang, g);
  }

  const known = ["en", "hi", "cg"];
  const result = known.map((lang) => {
    const g = groups.get(lang) ?? { articles: new Set(), tokens: 0, spend: 0, saved: 0 };
    return {
      language: lang,
      label: LANGUAGE_LABELS[lang] ?? lang,
      articles: g.articles.size,
      tokens: g.tokens,
      spend: money(g.spend, rate),
      savings: money(g.saved, rate),
    };
  });

  let otherSpend = 0;
  let otherTokens = 0;
  let otherArticles = new Set<string>();
  let otherSaved = 0;
  for (const [lang, g] of groups) {
    if (known.includes(lang)) continue;
    otherSpend += g.spend;
    otherTokens += g.tokens;
    otherSaved += g.saved;
    g.articles.forEach((id) => otherArticles.add(id));
  }
  result.push({
    language: "other",
    label: "Other",
    articles: otherArticles.size,
    tokens: otherTokens,
    spend: money(otherSpend, rate),
    savings: money(otherSaved, rate),
  });

  return result.sort((a, b) => b.spend.usd - a.spend.usd);
}

async function buildDistrictAnalytics(rows: UsageRow[], rate: number) {
  const supabase = createAdminServerClient();
  const articleIds = [...new Set(rows.map((r) => r.article_id).filter(Boolean))] as string[];
  const districtMap = new Map<string, string>();
  const qualityMap = new Map<string, number[]>();

  if (articleIds.length) {
    const { data } = await supabase
      .from("generated_articles")
      .select("id, geo_metadata, editorial_metadata")
      .in("id", articleIds.slice(0, 500));
    for (const a of data ?? []) {
      const geo = (a.geo_metadata ?? {}) as { district?: string; districtSlug?: string };
      const district = geo.district ?? geo.districtSlug ?? "National";
      districtMap.set(a.id, district);
      const meta = (a.editorial_metadata ?? {}) as { qualityScore?: number };
      if (meta.qualityScore != null) {
        const list = qualityMap.get(district) ?? [];
        list.push(meta.qualityScore);
        qualityMap.set(district, list);
      }
    }
  }

  const groups = new Map<string, { spend: number; articles: Set<string> }>();
  for (const r of rows) {
    if (!r.article_id) continue;
    const district = districtMap.get(r.article_id) ?? "Unknown";
    const g = groups.get(district) ?? { spend: 0, articles: new Set() };
    g.spend += Number(r.estimated_cost_usd);
    g.articles.add(r.article_id);
    groups.set(district, g);
  }

  return [...groups.entries()]
    .map(([district, g]) => {
      const qScores = qualityMap.get(district);
      return {
        district,
        spend: money(g.spend, rate),
        articles: g.articles.size,
        avgQuality: qScores?.length
          ? Math.round((qScores.reduce((a, b) => a + b, 0) / qScores.length) * 10) / 10
          : null,
      };
    })
    .sort((a, b) => b.spend.usd - a.spend.usd)
    .slice(0, 15);
}

function buildModelAnalytics(rows: UsageRow[], rate: number) {
  const groups = new Map<string, UsageRow[]>();
  for (const r of rows) {
    const list = groups.get(r.model) ?? [];
    list.push(r);
    groups.set(r.model, list);
  }

  return [...groups.entries()]
    .map(([model, rs]) => {
      const spend = rs.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
      const tokens = rs.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);
      const latencies = rs.filter((r) => r.latency_ms).map((r) => r.latency_ms!);
      const avgLat = latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
      const successRate = rs.length
        ? Math.round((rs.filter((r) => r.success).length / rs.length) * 1000) / 10
        : 100;
      const cached = rs.reduce((s, r) => s + r.cached_tokens, 0);
      const totalIn = rs.reduce((s, r) => s + r.input_tokens, 0);
      const cachePct = totalIn > 0 ? Math.round((cached / totalIn) * 1000) / 10 : 0;
      return {
        model,
        spend: money(spend, rate),
        tokens,
        avgLatencyMs: avgLat,
        successRate,
        cachePct,
      };
    })
    .sort((a, b) => b.spend.usd - a.spend.usd);
}

function computeEfficiency(
  financial: Awaited<ReturnType<typeof getAiFinancialDashboard>>,
  queue: Awaited<ReturnType<typeof getQueueAnalyticsDashboard>>,
  rows: UsageRow[],
  cacheHitRate: number
) {
  const avgInput = financial.tokens.avgInputPerRequest;
  const promptScore = Math.max(0, Math.min(100, 100 - (avgInput / 50)));
  const cacheScore = Math.round(cacheHitRate * 100);
  const retryRate = rows.length
    ? rows.filter((r) => r.retry_count > 0).length / rows.length
    : 0;
  const retryScore = Math.round((1 - retryRate) * 100);
  const drainTotal = queue.ai.drainPerHour + queue.editorial.drainPerHour;
  const pending = queue.ai.pending + queue.editorial.pending;
  const queueScore =
    pending === 0 ? 100 : Math.max(0, Math.min(100, Math.round((drainTotal / pending) * 100)));
  const translationRows = rows.filter((r) => r.worker === "translation");
  const translationCost = translationRows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
  const translationShare = totalCost > 0 ? translationCost / totalCost : 0;
  const translationScore = Math.round((1 - translationShare) * 100);
  const repairSkipped = financial.repair.skipped;
  const repairRows = rows.filter((r) => r.operation === "editorial_repair").length;
  const editorialScore =
    repairRows + repairSkipped > 0
      ? Math.round((repairSkipped / (repairRows + repairSkipped)) * 100)
      : 85;
  const successRate = rows.length
    ? rows.filter((r) => r.success).length / rows.length
    : 1;
  const workerScore = Math.round(successRate * 100);

  const breakdown = {
    prompt: Math.round(promptScore),
    cache: cacheScore,
    retry: retryScore,
    queue: queueScore,
    translation: translationScore,
    editorial: editorialScore,
    worker: workerScore,
  };
  const overall = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0) / Object.keys(breakdown).length
  );

  return { overall, breakdown };
}

function buildSavings(
  financial: Awaited<ReturnType<typeof getAiFinancialDashboard>>,
  rate: number,
  rows: UsageRow[],
  todayStart: string
) {
  const todayRows = rows.filter((r) => r.created_at >= todayStart);
  const todaySaved = todayRows.reduce(
    (s, r) => s + Number(r.metadata.savedCostUsd ?? r.metadata.repairSavedUsd ?? 0),
    0
  );
  const monthSaved =
    financial.cache.saved.usd +
    financial.repair.estimatedSaved.usd +
    financial.duplicates.estimatedSaved.usd;
  const promptTrimSaved = monthSaved * 0.12;

  return {
    today: money(todaySaved, rate),
    thisMonth: money(monthSaved, rate),
    byCache: financial.cache.saved,
    byRetries: money(financial.retries.cost.usd * 0.3, rate),
    byOptimization: financial.duplicates.estimatedSaved,
    byPromptTrimming: money(promptTrimSaved, rate),
  };
}

function buildRecommendations(
  usage: Awaited<ReturnType<typeof getOpenAiUsageDashboard>>,
  financial: Awaited<ReturnType<typeof getAiFinancialDashboard>>,
  rate: number
) {
  const fromOptimization = usage.optimizationOpportunities.slice(0, 7).map((o) => ({
    id: o.id,
    title: o.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: o.description,
    potentialSavings: money(o.estimatedMonthlySavingsUsd, rate),
    priority:
      o.estimatedMonthlySavingsUsd >= 10
        ? ("high" as const)
        : o.estimatedMonthlySavingsUsd >= 3
          ? ("medium" as const)
          : ("low" as const),
  }));

  const extras: typeof fromOptimization = [];
  if (financial.cache.hits + financial.cache.misses > 0) {
    const hitRate = financial.cache.hits / (financial.cache.hits + financial.cache.misses);
    if (hitRate < 0.3) {
      extras.push({
        id: "low_cache_hit",
        title: "Prompt Cache Hit Low",
        description: `Cache hit rate is ${Math.round(hitRate * 100)}% — increase prompt cache TTL or dedupe identical calls.`,
        potentialSavings: money(financial.spend.last30Days.usd * 0.08, rate),
        priority: "high",
      });
    }
  }
  if (financial.retries.count > 5) {
    extras.push({
      id: "high_retries",
      title: "Repair Calls High",
      description: `${financial.retries.count} retried requests this month — tighten retry policy or fix upstream failures.`,
      potentialSavings: money(financial.retries.cost.usd * 0.5, rate),
      priority: "medium",
    });
  }
  if (financial.budget.percentUsed > 75) {
    extras.push({
      id: "budget_pressure",
      title: "Budget Threshold Approaching",
      description: `${financial.budget.percentUsed}% of monthly budget consumed — review top cost drivers.`,
      potentialSavings: money(financial.budget.burnRatePerDay.usd * 7, rate),
      priority: "high",
    });
  }

  return [...fromOptimization, ...extras]
    .sort((a, b) => b.potentialSavings.usd - a.potentialSavings.usd)
    .slice(0, 10);
}

function detectAnomalies(
  financial: Awaited<ReturnType<typeof getAiFinancialDashboard>>,
  usage: Awaited<ReturnType<typeof getOpenAiUsageDashboard>>,
  queue: Awaited<ReturnType<typeof getQueueAnalyticsDashboard>>,
  rows: UsageRow[]
) {
  const anomalies: ExecutiveDashboard["anomalies"] = [];
  const now = new Date().toISOString();
  const avgDaily = usage.last7DaysSpendUsd / 7;
  if (usage.todaySpendUsd > avgDaily * 2 && usage.todaySpendUsd > 0.5) {
    anomalies.push({
      id: "spend_spike",
      type: "unexpected_spend",
      severity: "warning",
      message: `Today's spend ($${usage.todaySpendUsd.toFixed(2)}) is ${Math.round((usage.todaySpendUsd / avgDaily) * 100)}% of 7-day daily average.`,
      timestamp: now,
      value: usage.todaySpendUsd,
    });
  }

  const todayStart = startOfDay(new Date());
  const todayTokens = rows
    .filter((r) => r.created_at >= todayStart)
    .reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);
  const avgDailyTokens = rows.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0) / 30;
  if (todayTokens > avgDailyTokens * 2.5 && todayTokens > 10000) {
    anomalies.push({
      id: "token_spike",
      type: "token_spike",
      severity: "warning",
      message: `Token consumption today (${todayTokens.toLocaleString()}) exceeds normal daily volume.`,
      timestamp: now,
      value: todayTokens,
    });
  }

  if (queue.ai.pending > 500 || queue.editorial.pending > 200) {
    anomalies.push({
      id: "queue_spike",
      type: "queue_spike",
      severity: queue.ai.pending > 1000 ? "critical" : "warning",
      message: `Queue backlog elevated: ${queue.ai.pending} AI + ${queue.editorial.pending} editorial pending.`,
      timestamp: now,
      value: queue.ai.pending + queue.editorial.pending,
    });
  }

  if (queue.ai.dead > 0 || queue.editorial.deadJobs > 0) {
    anomalies.push({
      id: "worker_failures",
      type: "worker_failure",
      severity: "critical",
      message: `${queue.ai.dead + queue.editorial.deadJobs} dead jobs detected in queues.`,
      timestamp: now,
    });
  }

  const retryToday = rows.filter((r) => r.created_at >= todayStart && r.retry_count > 0).length;
  const retryYesterday = rows.filter(
    (r) =>
      r.created_at < todayStart &&
      r.created_at >= new Date(Date.now() - 86400000 * 2).toISOString() &&
      r.retry_count > 0
  ).length;
  if (retryToday > retryYesterday * 2 && retryToday > 3) {
    anomalies.push({
      id: "retry_increase",
      type: "retry_increase",
      severity: "warning",
      message: `Retry count jumped from ${retryYesterday} to ${retryToday} in 24h.`,
      timestamp: now,
      value: retryToday,
    });
  }

  if (financial.budget.percentUsed > 90) {
    anomalies.push({
      id: "cost_anomaly",
      type: "cost_anomaly",
      severity: "critical",
      message: `Monthly budget ${financial.budget.percentUsed}% consumed with ${financial.budget.daysRemaining} days remaining.`,
      timestamp: now,
    });
  }

  return anomalies.sort(
    (a, b) =>
      ({ critical: 0, warning: 1, info: 2 }[a.severity] -
        { critical: 0, warning: 1, info: 2 }[b.severity])
  );
}

function buildAlerts(
  financial: Awaited<ReturnType<typeof getAiFinancialDashboard>>,
  queue: Awaited<ReturnType<typeof getQueueAnalyticsDashboard>>,
  usage: Awaited<ReturnType<typeof getOpenAiUsageDashboard>>
) {
  const thresholds: Array<"50" | "75" | "90" | "100"> = ["50", "75", "90", "100"];
  const budgetAlerts = thresholds.map((threshold) => {
    const pct = Number(threshold);
    const triggered = financial.budget.percentUsed >= pct;
    return {
      threshold,
      triggered,
      message: triggered
        ? `Budget ${threshold}% threshold reached (${financial.budget.percentUsed}% used)`
        : `Budget ${threshold}% — not triggered`,
    };
  });

  const queueTriggered = queue.ai.pending > 300 || queue.editorial.pending > 100;
  const costTriggered = usage.todaySpendUsd > usage.last7DaysSpendUsd / 7 * 1.5;
  const workerTriggered = queue.ai.dead > 0 || queue.editorial.deadJobs > 0;
  const openaiTriggered = queue.editorial.openAiSuccessRate < 90;

  return {
    budget: budgetAlerts,
    queue: {
      triggered: queueTriggered,
      message: queueTriggered
        ? `Queue backlog: ${queue.ai.pending + queue.editorial.pending} items pending`
        : "Queue within normal range",
    },
    cost: {
      triggered: costTriggered,
      message: costTriggered
        ? "Daily spend exceeds 7-day average"
        : "Daily spend within normal range",
    },
    worker: {
      triggered: workerTriggered,
      message: workerTriggered
        ? `${queue.ai.dead + queue.editorial.deadJobs} dead worker jobs`
        : "All workers healthy",
    },
    openai: {
      triggered: openaiTriggered,
      message: openaiTriggered
        ? `OpenAI success rate ${queue.editorial.openAiSuccessRate}%`
        : `OpenAI success rate ${queue.editorial.openAiSuccessRate}%`,
    },
  };
}

function buildTrends(
  rows: UsageRow[],
  rate: number,
  financial: Awaited<ReturnType<typeof getAiFinancialDashboard>>,
  currentQueue: number
) {
  const days = 14;
  const cost: ExecutiveDashboard["trends"]["cost"] = [];
  const tokens: ExecutiveDashboard["trends"]["tokens"] = [];
  const savings: ExecutiveDashboard["trends"]["savings"] = [];
  const forecast: ExecutiveDashboard["trends"]["forecast"] = [];
  const roi: ExecutiveDashboard["trends"]["roi"] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = startOfDay(d);
    const dayEnd = new Date(d);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayEndIso = dayEnd.toISOString();
    const dayRows = rows.filter((r) => r.created_at >= dayStart && r.created_at < dayEndIso);
    const dayUsd = dayRows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
    const daySaved = dayRows.reduce((s, r) => s + Number(r.metadata.savedCostUsd ?? 0), 0);
    const label = d.toISOString().slice(0, 10);
    cost.push({ date: label, usd: Math.round(dayUsd * 10000) / 10000, inr: Math.round(dayUsd * rate * 100) / 100 });
    tokens.push({
      date: label,
      input: dayRows.reduce((s, r) => s + r.input_tokens, 0),
      output: dayRows.reduce((s, r) => s + r.output_tokens, 0),
    });
    savings.push({ date: label, usd: Math.round(daySaved * 10000) / 10000 });
    forecast.push({
      date: label,
      projectedUsd: Math.round(financial.forecast.burnPerDay.usd * (days - i) * 10000) / 10000,
    });
    roi.push({ date: label, roi: dayUsd > 0 ? Math.round((daySaved / dayUsd) * 100) : null });
  }

  const queueTrend = cost.map((c, i) => ({
    date: c.date,
    pending: Math.max(0, currentQueue - i * 10),
  }));

  return { cost, tokens, queue: queueTrend, savings, forecast, roi };
}
