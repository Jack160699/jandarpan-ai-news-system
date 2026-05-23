/**
 * Newsroom pipeline snapshot — counts + latest rows for debug dashboards
 */

import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { countPendingEditorialImages } from "@/lib/news/ai/generate-editorial-image";
import { buildGeneratedHomepageFeed } from "@/lib/homepage/generated-feed";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { buildTenantRegionalPersonalization } from "@/lib/tenant/personalization";
import { getDefaultTenant } from "@/lib/tenant/registry";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export type NewsroomEnvFlags = {
  clusterEvents: boolean;
  generateArticles: boolean;
  legacyBridge: boolean;
  editorialImages: boolean;
  useEmbeddings: boolean;
  openAiConfigured: boolean;
  gnewsConfigured: boolean;
  newsdataConfigured: boolean;
};

export type NewsroomSnapshot = {
  capturedAt: string;
  configured: boolean;
  env: NewsroomEnvFlags;
  counts: {
    news_signals: number | null;
    news_events: number | null;
    generated_articles: number | null;
    generated_published: number | null;
    news_articles: number | null;
    ingestion_logs: number | null;
    pending_ai_queue: number | null;
    pending_editorial_images: number | null;
  };
  latest: {
    signals: Pick<NewsSignalRow, "id" | "title" | "provider" | "source" | "created_at">[];
    events: Pick<
      NewsEventRow,
      "id" | "canonical_title" | "source_count" | "region" | "urgency_score" | "created_at"
    >[];
    generated: Pick<
      GeneratedArticleRow,
      "id" | "slug" | "headline" | "editorial_status" | "published_at" | "created_at"
    >[];
  };
  providerHealth: {
    api: Array<{ provider_id: string; health_score: number; disabled_until: string | null }>;
    rss: Array<{ source_id: string; name: string; consecutive_failures: number; disabled_until: string | null }>;
  };
  homepage: {
    ready: boolean;
    heroTitle: string | null;
    poolSize: number;
    sectionCounts: Record<string, number>;
    error: string | null;
  };
  ingestion: {
    lastLog: {
      id: string;
      status: string;
      inserted: number;
      total_fetched: number;
      duration_ms: number | null;
      created_at: string;
    } | null;
  };
};

function readEnvFlags(): NewsroomEnvFlags {
  return {
    clusterEvents: process.env.NEWSROOM_CLUSTER_EVENTS === "true",
    generateArticles: process.env.NEWSROOM_GENERATE_ARTICLES === "true",
    legacyBridge: process.env.NEWSROOM_LEGACY_BRIDGE !== "false",
    editorialImages: process.env.NEWSROOM_EDITORIAL_IMAGES === "true",
    useEmbeddings: process.env.NEWSROOM_USE_EMBEDDINGS === "true",
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    gnewsConfigured: Boolean(process.env.GNEWS_API_KEY?.trim()),
    newsdataConfigured: Boolean(process.env.NEWSDATA_API_KEY?.trim()),
  };
}

export async function captureNewsroomSnapshot(): Promise<NewsroomSnapshot> {
  const capturedAt = new Date().toISOString();
  const env = readEnvFlags();

  if (!isSupabaseConfigured()) {
    return {
      capturedAt,
      configured: false,
      env,
      counts: {
        news_signals: null,
        news_events: null,
        generated_articles: null,
        generated_published: null,
        news_articles: null,
        ingestion_logs: null,
        pending_ai_queue: null,
        pending_editorial_images: null,
      },
      latest: { signals: [], events: [], generated: [] },
      providerHealth: { api: [], rss: [] },
      homepage: {
        ready: false,
        heroTitle: null,
        poolSize: 0,
        sectionCounts: {},
        error: "supabase_not_configured",
      },
      ingestion: { lastLog: null },
    };
  }

  const supabase = createAdminServerClient();

  const [
    signalsCount,
    eventsCount,
    generatedCount,
    generatedPublishedCount,
    articlesCount,
    logsCount,
    signalsRes,
    eventsRes,
    generatedRes,
    apiHealthRes,
    rssHealthRes,
    lastLogRes,
    pendingAi,
    pendingImages,
  ] = await Promise.all([
    supabase.from("news_signals").select("id", { count: "exact", head: true }),
    supabase.from("news_events").select("id", { count: "exact", head: true }),
    supabase.from("generated_articles").select("id", { count: "exact", head: true }),
    supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .not("published_at", "is", null)
      .neq("editorial_status", "rejected")
      .neq("editorial_status", "pending"),
    supabase.from("news_articles").select("id", { count: "exact", head: true }),
    supabase.from("ingestion_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("news_signals")
      .select("id, title, provider, source, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("news_events")
      .select("id, canonical_title, source_count, region, urgency_score, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("generated_articles")
      .select("id, slug, headline, editorial_status, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("api_provider_health").select("provider_id, health_score, disabled_until"),
    supabase
      .from("rss_source_health")
      .select("source_id, name, consecutive_failures, disabled_until"),
    supabase
      .from("ingestion_logs")
      .select("id, status, inserted, total_fetched, duration_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    countPendingAiQueue().catch(() => null),
    countPendingEditorialImages().catch(() => null),
  ]);

  let homepageReady = false;
  let heroTitle: string | null = null;
  let poolSize = 0;
  let sectionCounts: Record<string, number> = {};
  let homepageError: string | null = null;

  try {
    const pool = await fetchGeneratedArticlePool(120);
    poolSize = pool.length;
    const tenant = getDefaultTenant();
    const feed = buildGeneratedHomepageFeed(pool, {
      personalization: buildTenantRegionalPersonalization(tenant),
    });
    homepageReady = Boolean(feed?.editorsPicks?.lead);
    heroTitle = feed?.editorsPicks?.lead?.headline ?? null;
    sectionCounts = {
      trending: feed?.trending?.length ?? 0,
      liveWire: feed?.liveWire?.length ?? 0,
      breaking: feed?.breakingTicker?.length ?? 0,
      categoryStreams: feed?.categoryStreams?.length ?? 0,
    };
  } catch (e) {
    homepageError = e instanceof Error ? e.message : "homepage_feed_failed";
  }

  return {
    capturedAt,
    configured: true,
    env,
    counts: {
      news_signals: signalsCount.count,
      news_events: eventsCount.count,
      generated_articles: generatedCount.count,
      generated_published: generatedPublishedCount.count,
      news_articles: articlesCount.count,
      ingestion_logs: logsCount.count,
      pending_ai_queue: pendingAi,
      pending_editorial_images: pendingImages,
    },
    latest: {
      signals: signalsRes.data ?? [],
      events: eventsRes.data ?? [],
      generated: generatedRes.data ?? [],
    },
    providerHealth: {
      api: (apiHealthRes.data ?? []).map((r) => ({
        provider_id: r.provider_id,
        health_score: r.health_score,
        disabled_until: r.disabled_until,
      })),
      rss: (rssHealthRes.data ?? []).map((r) => ({
        source_id: r.source_id,
        name: r.name,
        consecutive_failures: r.consecutive_failures,
        disabled_until: r.disabled_until,
      })),
    },
    homepage: {
      ready: homepageReady,
      heroTitle,
      poolSize,
      sectionCounts,
      error: homepageError,
    },
    ingestion: {
      lastLog: lastLogRes.data
        ? {
            id: lastLogRes.data.id,
            status: lastLogRes.data.status,
            inserted: lastLogRes.data.inserted,
            total_fetched: lastLogRes.data.total_fetched,
            duration_ms: lastLogRes.data.duration_ms,
            created_at: lastLogRes.data.created_at,
          }
        : null,
    },
  };
}
