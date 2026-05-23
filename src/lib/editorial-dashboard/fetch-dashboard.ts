/**
 * Fetch full editorial dashboard snapshot (service role)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { getTrendingSearches } from "@/lib/search/trending-queries";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
import type {
  DashboardGeneratedArticle,
  EditorialDashboardSnapshot,
} from "@/lib/editorial-dashboard/types";

export async function fetchEditorialDashboard(): Promise<EditorialDashboardSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();

  const [
    logsRes,
    failuresRes,
    healthRes,
    aiQueueRes,
    eventsRes,
    articlesRes,
    imageQueueRes,
    signalsCount,
  ] = await Promise.all([
    supabase
      .from("ingestion_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ingestion_failures")
      .select("id, title, provider, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("rss_source_health").select("*"),
    supabase
      .from("news_ai_queue")
      .select("id, article_id, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("news_events")
      .select(
        "id, canonical_title, region, category, urgency_score, source_count, signal_ids, clustering_metadata, created_at"
      )
      .order("urgency_score", { ascending: false })
      .limit(25),
    supabase
      .from("generated_articles")
      .select(
        "id, slug, headline, summary, editorial_status, homepage_pin, published_at, editorial_metadata, language, created_at, hero_image_url, event_id"
      )
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("editorial_image_queue")
      .select(
        "id, generated_article_id, status, attempts, image_source, error, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("news_signals")
      .select("id", { count: "exact", head: true }),
  ]);

  const healthMap = new Map(
    (healthRes.data ?? []).map((r) => [r.source_id, r])
  );

  const sourceHealth = RSS_SOURCES.map((source) => {
    const record = healthMap.get(source.id);
    const disabled =
      record?.disabled_until &&
      new Date(record.disabled_until as string).getTime() > Date.now();

    return {
      source_id: source.id,
      name: source.name,
      tier: source.tier,
      healthy: Boolean(record?.last_success) && !disabled,
      failures: (record?.failure_count as number) ?? 0,
      consecutive_failures: (record?.consecutive_failures as number) ?? 0,
      disabled_until: (record?.disabled_until as string) ?? null,
      last_success: (record?.last_success as string) ?? null,
      avg_articles: 0,
    };
  });

  const generatedArticles = (articlesRes.data ?? []).map((row) => {
    const meta = (row.editorial_metadata ?? {}) as Record<string, unknown>;
    const breakdown = (meta.quality_breakdown ?? {}) as Record<string, number>;
    const attribution =
      (meta.source_attribution as DashboardGeneratedArticle["source_attribution"]) ??
      [];
    return {
      id: row.id,
      slug: row.slug,
      headline: row.headline,
      summary: row.summary,
      editorial_status: (row.editorial_status ?? "approved") as
        | "pending"
        | "approved"
        | "rejected",
      homepage_pin: row.homepage_pin ?? false,
      is_breaking: Boolean(meta.is_breaking),
      is_featured: Boolean(meta.is_featured) || Boolean(row.homepage_pin),
      published_at: row.published_at,
      ai_confidence: (meta.ai_confidence as number) ?? null,
      readability: breakdown.readability ?? null,
      seo_quality: breakdown.seo_quality ?? null,
      local_relevance: breakdown.local_relevance ?? null,
      originality: breakdown.originality ?? null,
      source_count: (meta.source_count as number) ?? attribution.length ?? null,
      event_id: row.event_id ?? (meta.event_id as string) ?? null,
      language: row.language,
      created_at: row.created_at,
      source_attribution: attribution,
      hero_image_url: (row as { hero_image_url?: string }).hero_image_url ?? null,
    };
  });

  const reliabilityMap = new Map<
    string,
    { confidenceSum: number; count: number; provider: string }
  >();

  for (const article of articlesRes.data ?? []) {
    const meta = (article.editorial_metadata ?? {}) as {
      source_attribution?: Array<{
        source: string | null;
        provider: string;
        confidence: number;
      }>;
      ai_confidence?: number;
    };
    const sources = meta.source_attribution ?? [];
    if (sources.length) {
      for (const s of sources) {
        const key = `${s.source ?? "unknown"}|${s.provider}`;
        const prev = reliabilityMap.get(key) ?? {
          confidenceSum: 0,
          count: 0,
          provider: s.provider,
        };
        reliabilityMap.set(key, {
          provider: s.provider,
          confidenceSum: prev.confidenceSum + (s.confidence ?? 0.5),
          count: prev.count + 1,
        });
      }
    } else if (meta.ai_confidence) {
      const key = "editorial|cg";
      const prev = reliabilityMap.get(key) ?? {
        confidenceSum: 0,
        count: 0,
        provider: "editorial",
      };
      reliabilityMap.set(key, {
        provider: "editorial",
        confidenceSum: prev.confidenceSum + meta.ai_confidence,
        count: prev.count + 1,
      });
    }
  }

  const sourceReliability = [...reliabilityMap.entries()]
    .map(([key, v]) => {
      const [source] = key.split("|");
      return {
        source,
        provider: v.provider,
        avgConfidence: v.count ? v.confidenceSum / v.count : 0,
        articleCount: v.count,
      };
    })
    .sort((a, b) => b.avgConfidence - a.avgConfidence)
    .slice(0, 12);

  const pending = generatedArticles.filter((a) => a.editorial_status === "pending").length;
  const approved = generatedArticles.filter((a) => a.editorial_status === "approved").length;
  const aiPending = (aiQueueRes.data ?? []).filter((q) => q.status === "pending").length;
  const imagePending = (imageQueueRes.data ?? []).filter(
    (q) => q.status === "pending"
  ).length;

  const topRanked = [...generatedArticles]
    .filter((a) => a.editorial_status === "approved")
    .sort((a, b) => (b.ai_confidence ?? 0) - (a.ai_confidence ?? 0))
    .slice(0, 5);

  const logs = (logsRes.data ?? []).map((log) => ({
    id: log.id,
    status: log.status,
    inserted: log.inserted,
    total_fetched: log.total_fetched,
    failed_validation: log.failed_validation,
    duration_ms: log.duration_ms,
    created_at: log.created_at,
    metadata: log.metadata as Record<string, unknown> | null,
  }));

  return {
    fetchedAt: new Date().toISOString(),
    counts: {
      signals: signalsCount.count ?? 0,
      events: eventsRes.data?.length ?? 0,
      generated: generatedArticles.length,
      pending,
      approved,
      aiQueuePending: aiPending,
      imageQueuePending: imagePending,
    },
    ingestion: {
      lastRun: logs[0] ?? null,
      recentLogs: logs,
      recentFailures: failuresRes.data ?? [],
    },
    sourceHealth,
    aiQueue: (aiQueueRes.data ?? []).map((q) => ({
      id: q.id,
      article_id: q.article_id,
      status: q.status,
      error: q.error,
      created_at: q.created_at,
    })),
    eventClusters: (eventsRes.data ?? []).map((e) => ({
      id: e.id,
      canonical_title: e.canonical_title,
      region: e.region,
      category: e.category,
      urgency_score: Number(e.urgency_score),
      source_count: e.source_count,
      signal_count: (e.signal_ids ?? []).length,
      clustering_metadata: (e.clustering_metadata ?? {}) as Record<
        string,
        unknown
      >,
      created_at: e.created_at,
    })),
    generatedArticles,
    imageQueue: (imageQueueRes.data ?? []).map((q) => ({
      id: q.id,
      generated_article_id: q.generated_article_id,
      status: q.status,
      attempts: q.attempts,
      image_source: q.image_source,
      error: q.error,
      created_at: q.created_at,
    })),
    trending: {
      topHeadlines: topRanked.map((a) => ({
        headline: a.headline,
        score: a.ai_confidence ?? 0,
      })),
      trendingSearches: getTrendingSearches(8),
      rankingAvg:
        topRanked.length > 0
          ? topRanked.reduce((s, a) => s + (a.ai_confidence ?? 0), 0) /
            topRanked.length
          : 0,
      breakingCount: generatedArticles.filter((a) => a.is_breaking).length,
    },
    sourceReliability,
  };
}
