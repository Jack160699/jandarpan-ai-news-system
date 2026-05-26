/**
 * Orchestrates full newsroom intelligence snapshot from Supabase
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { detectBreakingCandidates } from "@/lib/intelligence/breaking-detector";
import { buildDistrictHeatmap } from "@/lib/intelligence/district-heatmap";
import {
  detectDuplicateStories,
  countDuplicateClusters,
} from "@/lib/intelligence/duplicate-detection";
import { buildEventClusterInsights } from "@/lib/intelligence/event-clusters";
import { scoreFakeNewsRisk } from "@/lib/intelligence/fake-news-risk";
import { getMultilingualPipelineStatus } from "@/lib/intelligence/multilingual-pipeline";
import { buildEditorialRecommendations } from "@/lib/intelligence/recommendations";
import { findSeoOpportunities } from "@/lib/intelligence/seo-opportunities";
import {
  buildSourceTrustEngine,
  aggregateArticleTrust,
} from "@/lib/intelligence/source-trust";
import { buildAutomatedSummary } from "@/lib/intelligence/summaries";
import {
  forecastTrends,
  buildTopicMomentum,
} from "@/lib/intelligence/trend-forecast";
import type {
  ArticleIntelligenceCard,
  NewsroomIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { predictViralSpread } from "@/lib/intelligence/viral-prediction";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsEventRow } from "@/lib/types/newsroom";

export async function buildNewsroomIntelligenceSnapshot(
  tenantId?: string | null
): Promise<NewsroomIntelligenceSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();

  let articlesQuery = supabase
    .from("generated_articles")
    .select(
      "id, slug, headline, summary, article_body, seo_title, seo_description, editorial_status, published_at, created_at, language, translations, editorial_metadata, geo_metadata, event_id, tags"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (tenantId) {
    articlesQuery = articlesQuery.eq("tenant_id", tenantId);
  }

  const [articlesRes, eventsRes, healthRes] = await Promise.all([
    articlesQuery,
    supabase
      .from("news_events")
      .select(
        "id, canonical_title, region, category, urgency_score, source_count, signal_ids, clustering_metadata, created_at"
      )
      .order("urgency_score", { ascending: false })
      .limit(30),
    supabase.from("rss_source_health").select("*"),
  ]);

  const articles = (articlesRes.data ?? []) as GeneratedArticleRow[];
  const events = eventsRes.data ?? [];

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

  const sourceTrust = buildSourceTrustEngine({
    sourceHealth: healthRes.data ?? [],
    attributions,
  });

  const duplicates = detectDuplicateStories(
    articles.map((a) => ({ id: a.id, headline: a.headline, slug: a.slug }))
  );

  const eventClusters = buildEventClusterInsights(events);

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
  const districtHeatmap = buildDistrictHeatmap(articles);
  const multilingual = getMultilingualPipelineStatus(articles);

  const articleCards: ArticleIntelligenceCard[] = [];
  const topRisks: NewsroomIntelligenceSnapshot["topRisks"] = [];
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
  });

  const avgTrust =
    articleCards.length > 0
      ? articleCards.reduce((s, c) => s + c.trustScore, 0) / articleCards.length
      : 0;
  const avgViral =
    viralPredictions.length > 0
      ? viralPredictions.reduce((s, v) => s + v.viralScore, 0) / viralPredictions.length
      : 0;

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
    },
    fakeNewsRisks: [],
    topRisks: topRisks.slice(0, 10),
    sourceTrust,
    duplicates,
    eventClusters,
    viralPredictions,
    trendForecasts,
    topicMomentum,
    recommendations,
    districtHeatmap,
    breakingCandidates,
    seoOpportunities,
    multilingual,
    articleCards: articleCards.slice(0, 40),
  };
}

function rowMeta(row: GeneratedArticleRow): Record<string, unknown> {
  return (row.editorial_metadata ?? {}) as Record<string, unknown>;
}
