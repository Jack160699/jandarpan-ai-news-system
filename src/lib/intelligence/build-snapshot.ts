/**
 * Orchestrates full newsroom intelligence snapshot from Supabase + vector layer
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJson, asJsonObject, jsonObjectFrom, type JsonObject } from "@/types/json";
import { suggestTranslations } from "@/lib/intelligence/ai-translations";
import { detectBreakingCandidates } from "@/lib/intelligence/breaking-detector";
import { buildDistrictHeatmap } from "@/lib/intelligence/district-heatmap";
import { buildDistrictRiskAlerts } from "@/lib/intelligence/district-risk-alerts";
import {
  detectDuplicateStories,
  countDuplicateClusters,
} from "@/lib/intelligence/duplicate-detection";
import { buildEventClusterInsights } from "@/lib/intelligence/event-clusters";
import { buildEventRelationshipGraph } from "@/lib/intelligence/event-graph";
import { scoreFakeNewsRisk } from "@/lib/intelligence/fake-news-risk";
import { suggestFactChecks } from "@/lib/intelligence/fact-check-suggestions";
import {
  analyzeLiveSignals,
  type RawSignal,
} from "@/lib/intelligence/ingestion-analyzer";
import { getMultilingualPipelineStatus } from "@/lib/intelligence/multilingual-pipeline";
import { scorePoliticalSensitivity } from "@/lib/intelligence/political-sensitivity";
import { buildEditorialRecommendations } from "@/lib/intelligence/recommendations";
import { findSeoOpportunities } from "@/lib/intelligence/seo-opportunities";
import { analyzeSentiment } from "@/lib/intelligence/sentiment-analysis";
import {
  loadSourceReputationMemory,
  syncReputationFromIngestion,
} from "@/lib/intelligence/source-reputation-memory";
import {
  buildSourceTrustEngine,
  aggregateArticleTrust,
} from "@/lib/intelligence/source-trust";
import { buildAutomatedSummary } from "@/lib/intelligence/summaries";
import { detectTrendAcceleration } from "@/lib/intelligence/trend-acceleration";
import {
  forecastTrends,
  buildTopicMomentum,
} from "@/lib/intelligence/trend-forecast";
import type {
  ArticleIntelligenceCard,
  ConfidenceHeatCell,
  NewsroomIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { clusterByEmbeddings } from "@/lib/intelligence/vector/semantic-cluster";
import {
  batchEmbedSignals,
  findSimilarByText,
} from "@/lib/intelligence/vector/vector-store";
import { predictViralSpread } from "@/lib/intelligence/viral-prediction";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsEventRow } from "@/lib/types/newsroom";
import { cacheSetJson } from "@/lib/infrastructure/cache";
import { WORKER_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import {
  isMissingColumnError,
  traceSchemaMismatch,
} from "@/lib/observability/schema-mismatch-trace";

export type BuildSnapshotMode = "read" | "worker";

export type BuildSnapshotOptions = {
  /** read = skip embeddings/clustering (API fast path); worker = full precompute */
  mode?: BuildSnapshotMode;
};

export async function saveIntelligenceSnapshot(
  tenantId: string | null | undefined,
  snapshot: NewsroomIntelligenceSnapshot,
  buildDurationMs: number
): Promise<void> {
  const supabase = createAdminServerClient();
  const tenantKey = tenantId ?? "global";

  await supabase.from("intelligence_snapshots").upsert(
    {
      tenant_id: tenantId ?? null,
      snapshot: asJson(snapshot),
      build_duration_ms: buildDurationMs,
      built_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  const ttl = Number(process.env.INTELLIGENCE_CACHE_TTL_SEC) || 60;
  await cacheSetJson(
    WORKER_CACHE_KEYS.intelligence(tenantKey),
    snapshot,
    ttl
  );
}

export async function buildNewsroomIntelligenceSnapshot(
  tenantId?: string | null,
  options?: BuildSnapshotOptions
): Promise<NewsroomIntelligenceSnapshot | null> {
  const mode = options?.mode ?? "read";
  const runHeavyWork = mode === "worker";
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();

  const selectWithTranslations =
    "id, slug, headline, summary, article_body, seo_title, seo_description, editorial_status, published_at, created_at, language, translations, editorial_metadata, geo_metadata, event_id, tags";
  const selectWithoutTranslations =
    "id, slug, headline, summary, article_body, seo_title, seo_description, editorial_status, published_at, created_at, language, editorial_metadata, geo_metadata, event_id, tags";

  let articlesQuery = supabase
    .from("generated_articles")
    .select(
      selectWithTranslations
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (tenantId) {
    articlesQuery = articlesQuery.eq("tenant_id", tenantId);
  }

  let signalsQuery = supabase
    .from("news_signals")
    .select(
      "id, title, provider, source, region, category, published_at, created_at, article_url, raw_content"
    )
    .order("created_at", { ascending: false })
    .limit(80);

  if (tenantId) {
    signalsQuery = signalsQuery.eq("tenant_id", tenantId);
  }

  const [articlesRes, eventsRes, healthRes, signalsRes] = await Promise.all([
    articlesQuery,
    supabase
      .from("news_events")
      .select(
        "id, canonical_title, region, category, urgency_score, source_count, signal_ids, clustering_metadata, created_at"
      )
      .order("urgency_score", { ascending: false })
      .limit(30),
    supabase.from("rss_source_health").select("*"),
    signalsQuery,
  ]);

  // Degraded mode: DB missing translations column (migration not applied).
  if (
    articlesRes.error &&
    isMissingColumnError(articlesRes.error.message, "translations")
  ) {
    traceSchemaMismatch("generated_articles.translations missing (snapshot fallback)", {
      fn: "buildNewsroomIntelligenceSnapshot",
      tenantId: tenantId ?? null,
    });
    let retryQuery = supabase
      .from("generated_articles")
      .select(selectWithoutTranslations)
      .order("created_at", { ascending: false })
      .limit(100);
    if (tenantId) {
      retryQuery = retryQuery.eq("tenant_id", tenantId);
    }
    const retry = await retryQuery;
    (articlesRes as any).data = retry.data;
    (articlesRes as any).error = retry.error;
  }

  const articles = (articlesRes.data ?? []) as unknown as GeneratedArticleRow[];
  const events = eventsRes.data ?? [];
  const signals = (signalsRes.data ?? []) as RawSignal[];

  const eventMap = new Map(events.map((e) => [e.id, e as NewsEventRow]));

  const attributions: Array<{
    source: string;
    provider: string;
    confidence: number;
  }> = [];

  for (const row of articles) {
    const meta = (row.editorial_metadata ?? {}) as {
      source_attribution?: Array<{
        source: string | null;
        provider: string;
        confidence: number;
      }>;
    };
    for (const s of meta.source_attribution ?? []) {
      attributions.push({
        source: s.source ?? "unknown",
        provider: s.provider,
        confidence: s.confidence ?? 0.5,
      });
    }
  }

  const [sourceTrust, sourceReputation, embeddedCount] = await Promise.all([
    Promise.resolve(
      buildSourceTrustEngine({
        sourceHealth: healthRes.data ?? [],
        attributions,
      })
    ),
    loadSourceReputationMemory(tenantId),
    runHeavyWork
      ? batchEmbedSignals(
          signals.slice(0, 25).map((s) => ({
            id: s.id,
            title: s.title,
            raw_content: s.title,
            provider: s.provider,
          })),
          tenantId
        ).catch(() => 0)
      : Promise.resolve(0),
  ]);

  if (runHeavyWork) {
    void syncReputationFromIngestion({
      tenantId,
      signals: signals.map((s) => ({
        provider: s.provider,
        source: s.source,
        title: s.title,
      })),
    }).catch(() => undefined);
  }

  const duplicates = detectDuplicateStories(
    articles.map((a) => ({ id: a.id, headline: a.headline, slug: a.slug }))
  );

  const semanticClusters = runHeavyWork
    ? await clusterByEmbeddings({
        items: signals.slice(0, 20).map((s) => ({
          id: s.id,
          text: s.title,
        })),
        threshold: 0.82,
      }).catch(() => [])
    : [];

  const vectorDuplicates: NewsroomIntelligenceSnapshot["vectorDuplicates"] = [];
  if (runHeavyWork) {
    for (const a of articles.slice(0, 8)) {
      const matches = await findSimilarByText({
        text: a.headline,
        tenantId,
        entityType: "signal",
        limit: 3,
      }).catch(() => []);
      for (const m of matches) {
        if (m.similarity < 0.8) continue;
        vectorDuplicates.push({
          entityId: m.entityId,
          entityType: m.entityType,
          similarity: m.similarity,
          headline: (m.metadata.title as string) ?? a.headline,
        });
      }
    }
  }

  const eventClusters = buildEventClusterInsights(events);
  const eventGraph = buildEventRelationshipGraph(
    events.map((e) => ({
      id: e.id,
      canonical_title: e.canonical_title,
      region: e.region,
      category: e.category,
      signal_ids: e.signal_ids ?? [],
      urgency_score: Number(e.urgency_score),
    }))
  );

  const breakingCandidates = detectBreakingCandidates(
    articles.map((a) => ({
      id: a.id,
      headline: a.headline,
      summary: a.summary,
      published_at: a.published_at,
      is_breaking: Boolean(rowMeta(a).is_breaking),
      event: a.event_id ? eventMap.get(a.event_id) ?? null : null,
    }))
  );

  const seoOpportunities = findSeoOpportunities(
    articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      headline: a.headline,
      summary: a.summary,
      seo_title: a.seo_title,
      seo_description: a.seo_description,
      article_body: a.article_body,
    }))
  );

  const viralPredictions = predictViralSpread(
    articles.map((a) => {
      const meta = rowMeta(a);
      return {
        id: a.id,
        slug: a.slug,
        headline: a.headline,
        summary: a.summary,
        published_at: a.published_at,
        created_at: a.created_at,
        is_breaking: Boolean(meta.is_breaking),
        ai_confidence: meta.ai_confidence as number | null,
        source_count: (meta.source_count as number) ?? null,
      };
    })
  );

  const trendForecasts = forecastTrends(articles);
  const topicMomentum = buildTopicMomentum(articles);
  const districtHeatmap = await buildDistrictHeatmap(articles);
  const translationSuggestions = suggestTranslations({
    articles: articles.map((a) => ({
      id: a.id,
      headline: a.headline,
      language: a.language,
      translations: a.translations ?? null,
      region: (a.geo_metadata as { district?: string })?.district ?? null,
    })),
  });
  const multilingual = getMultilingualPipelineStatus(articles);
  multilingual.pendingCount += translationSuggestions.length;

  const trendAcceleration = detectTrendAcceleration(
    articles.map((a) => ({
      created_at: a.created_at,
      headline: a.headline,
      tags: a.tags ?? undefined,
    }))
  );

  const liveSignalFeed = analyzeLiveSignals(signals);

  const breakingByDistrict = new Map<string, number>();
  for (const a of articles) {
    const slug =
      (a.geo_metadata as { districtSlug?: string })?.districtSlug ?? "unknown";
    if (breakingCandidates.some((b) => b.articleId === a.id)) {
      breakingByDistrict.set(slug, (breakingByDistrict.get(slug) ?? 0) + 1);
    }
  }

  const districtRiskAlerts = buildDistrictRiskAlerts(
    districtHeatmap,
    breakingByDistrict
  );

  const confidenceHeatmap = buildConfidenceHeatmap(articles, sourceTrust);

  const articleCards: ArticleIntelligenceCard[] = [];
  const topRisks: NewsroomIntelligenceSnapshot["topRisks"] = [];
  const sentiments: NewsroomIntelligenceSnapshot["sentiments"] = [];
  const politicalSensitivity: NewsroomIntelligenceSnapshot["politicalSensitivity"] =
    [];
  const factCheckQueue: NewsroomIntelligenceSnapshot["factCheckQueue"] = [];
  let highRiskCount = 0;

  const dupByArticle = new Map(duplicates.map((d) => [d.articleId, d]));

  for (const a of articles) {
    const meta = rowMeta(a);
    const attr =
      (meta.source_attribution as Array<{
        source: string | null;
        provider: string;
        confidence: number;
      }>) ?? [];

    const dup = dupByArticle.get(a.id);
    const fakeNewsRisk = scoreFakeNewsRisk({
      headline: a.headline,
      summary: a.summary ?? "",
      articleBody: a.article_body ?? "",
      sourceCount: attr.length || ((meta.source_count as number) ?? 0),
      aiConfidence: meta.ai_confidence as number | null,
      spamScore: (meta.quality_breakdown as { spamScore?: number })?.spamScore,
      duplicateSimilarity: dup?.similarity,
    });

    if (fakeNewsRisk.level === "high" || fakeNewsRisk.level === "critical") {
      highRiskCount += 1;
      topRisks.push({
        ...fakeNewsRisk,
        articleId: a.id,
        headline: a.headline,
      });
    }

    const sentiment = analyzeSentiment(`${a.headline} ${a.summary ?? ""}`);
    sentiments.push({
      articleId: a.id,
      label: sentiment.label,
      score: sentiment.score,
      polarity: sentiment.polarity,
    });

    const political = scorePoliticalSensitivity(
      `${a.headline} ${a.summary ?? ""} ${a.article_body ?? ""}`
    );
    politicalSensitivity.push({
      articleId: a.id,
      score: political.score,
      level: political.level,
      topics: political.topics,
    });

    const fc = suggestFactChecks({
      headline: a.headline,
      summary: a.summary ?? "",
      sourceCount: attr.length,
    });
    for (const suggestion of fc.slice(0, 2)) {
      factCheckQueue.push({
        ...suggestion,
        articleId: a.id,
        headline: a.headline,
      });
    }

    const trustScore = aggregateArticleTrust(
      attr.map((s) => ({
        source: s.source ?? "unknown",
        provider: s.provider,
        confidence: s.confidence,
      })),
      sourceTrust
    );

    const viral = viralPredictions.find((v) => v.articleId === a.id);
    const topicMatch = topicMomentum.find((t) =>
      new RegExp(t.label, "i").test(`${a.headline} ${a.summary ?? ""}`)
    );
    const momentum = topicMatch?.momentum ?? viral?.viralScore ?? 0;

    const transKeys = Object.keys(a.translations ?? {}).filter((k) => k !== "meta");

    articleCards.push({
      articleId: a.id,
      slug: a.slug,
      headline: a.headline,
      fakeNewsRisk,
      trustScore,
      duplicateClusterId: dup?.clusterId ?? null,
      viralScore: viral?.viralScore ?? 0,
      momentum: typeof momentum === "number" ? momentum : 0,
      breakingScore:
        breakingCandidates.find((b) => b.articleId === a.id)?.breakingScore ?? 0,
      seoScore:
        seoOpportunities.find((s) => s.articleId === a.id)?.seoScore ??
        (meta.quality_breakdown as { seoQuality?: number })?.seoQuality ??
        0.5,
      summary: buildAutomatedSummary({
        headline: a.headline,
        summary: a.summary,
        articleBody: a.article_body,
      }),
      language: a.language,
      translationLocales: transKeys,
    });
  }

  topRisks.sort((a, b) => b.score - a.score);

  const pendingCount = articles.filter(
    (a) => a.editorial_status === "pending"
  ).length;

  const recommendations = buildEditorialRecommendations({
    articles: articleCards.map((c) => {
      const row = articles.find((a) => a.id === c.articleId);
      return {
        id: c.articleId,
        headline: c.headline,
        editorial_status: row?.editorial_status ?? "pending",
        fakeRiskLevel: c.fakeNewsRisk.level,
        viralScore: c.viralScore,
        seoScore: c.seoScore,
        breakingScore: c.breakingScore,
        is_breaking: row ? Boolean(rowMeta(row).is_breaking) : false,
        published_at: row?.published_at ?? null,
        duplicateClusterId: c.duplicateClusterId,
      };
    }),
    breakingCandidates,
    seoOpportunities,
    pendingCount,
    highRiskCount,
    duplicateCount: countDuplicateClusters(duplicates),
    trendAlerts: trendAcceleration.filter((t) => t.alert).length,
    districtAlerts: districtRiskAlerts.length,
    semanticClusters: semanticClusters.filter((c) => c.memberIds.length > 1)
      .length,
    translationGaps: translationSuggestions.length,
  });

  const avgTrust =
    articleCards.length > 0
      ? articleCards.reduce((s, c) => s + c.trustScore, 0) / articleCards.length
      : 0;
  const avgViral =
    viralPredictions.length > 0
      ? viralPredictions.reduce((s, v) => s + v.viralScore, 0) /
        viralPredictions.length
      : 0;

  const signals24h = signals.filter((s) => {
    const age = Date.now() - new Date(s.created_at).getTime();
    return age <= 24 * 60 * 60 * 1000;
  }).length;

  const providerCounts = new Map<string, number>();
  for (const s of signals) {
    providerCounts.set(s.provider, (providerCounts.get(s.provider) ?? 0) + 1);
  }

  const ingestionAnalysis: NewsroomIntelligenceSnapshot["ingestionAnalysis"] = {
    signalsIngested24h: signals24h,
    embeddedCount,
    avgMisinfoRisk:
      liveSignalFeed.length > 0
        ? liveSignalFeed.reduce((sum, i) => sum + i.misinfoRisk, 0) /
          liveSignalFeed.length
        : 0,
    avgBreakingProbability:
      liveSignalFeed.length > 0
        ? liveSignalFeed.reduce((sum, i) => sum + i.breakingProbability, 0) /
          liveSignalFeed.length
        : 0,
    topProviders: [...providerCounts.entries()]
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };

  return {
    fetchedAt: new Date().toISOString(),
    summary: {
      articlesAnalyzed: articles.length,
      eventsClustered: eventClusters.length,
      highRiskCount,
      breakingCandidates: breakingCandidates.length,
      duplicateClusters: countDuplicateClusters(duplicates),
      avgTrustScore: Math.round(avgTrust * 1000) / 1000,
      avgViralScore: Math.round(avgViral * 1000) / 1000,
      semanticClusters: semanticClusters.filter((c) => c.memberIds.length > 1)
        .length,
      liveSignals: liveSignalFeed.length,
      districtAlerts: districtRiskAlerts.length,
      vectorIndexed: embeddedCount,
    },
    fakeNewsRisks: [],
    topRisks: topRisks.slice(0, 10),
    sourceTrust,
    sourceReputation,
    duplicates,
    vectorDuplicates: vectorDuplicates.slice(0, 15),
    eventClusters,
    semanticClusters: semanticClusters.slice(0, 12),
    eventGraph,
    viralPredictions,
    trendForecasts,
    trendAcceleration,
    topicMomentum,
    recommendations,
    districtHeatmap,
    districtRiskAlerts,
    confidenceHeatmap,
    breakingCandidates,
    seoOpportunities,
    multilingual,
    articleCards: articleCards.slice(0, 40),
    liveSignalFeed: liveSignalFeed.slice(0, 40),
    ingestionAnalysis,
    sentiments: sentiments.slice(0, 20),
    politicalSensitivity: politicalSensitivity
      .filter((p) => p.score >= 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15),
    factCheckQueue: factCheckQueue.slice(0, 20),
  };
}

function buildConfidenceHeatmap(
  articles: GeneratedArticleRow[],
  sourceTrust: ReturnType<typeof buildSourceTrustEngine>
): ConfidenceHeatCell[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const a of articles) {
    const meta = rowMeta(a);
    const conf = (meta.ai_confidence as number) ?? 0.55;
    const region =
      (a.geo_metadata as { district?: string })?.district ?? "National";
    const b = buckets.get(region) ?? { sum: 0, count: 0 };
    b.sum += conf;
    b.count += 1;
    buckets.set(region, b);
  }

  for (const st of sourceTrust.slice(0, 5)) {
    const key = `Source: ${st.sourceName}`;
    buckets.set(key, { sum: st.trustScore, count: 1 });
  }

  return [...buckets.entries()]
    .map(([label, b]) => ({
      key: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      confidence: Math.round((b.sum / b.count) * 100) / 100,
      count: b.count,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 16);
}

function rowMeta(row: GeneratedArticleRow): JsonObject {
  return asJsonObject((row.editorial_metadata ?? {}) as Record<string, unknown>);
}
