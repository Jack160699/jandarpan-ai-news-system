/**
 * Daily Newsroom Audit Report — deterministic metric collection.
 *
 * Every numeric field is backed by an actual query against existing tables
 * for the given IST calendar day. Nothing here is fabricated: a query
 * failure or a missing integration (e.g. GSC/GA — see audience_seo) yields
 * an explicit `{status: "unavailable", reason}` instead of a silent 0, so a
 * downstream reader (human or AI) never mistakes "we didn't measure this"
 * for "nothing happened."
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { getIstDayBounds } from "@/lib/autonomous/ist-day";
import { pipelineWarn } from "@/lib/observability/production-log";

export type MetricResult<T> =
  | { status: "ok"; value: T }
  | { status: "unavailable"; value: null; reason: string };

function ok<T>(value: T): MetricResult<T> {
  return { status: "ok", value };
}

function unavailable<T>(reason: string): MetricResult<T> {
  return { status: "unavailable", value: null, reason };
}

async function safe<T>(
  label: string,
  fn: () => Promise<T>
): Promise<MetricResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    pipelineWarn("[newsroom_audit_metric_error]", { label, reason });
    return unavailable(reason);
  }
}

const WORKFLOW_STATUSES = [
  "draft",
  "review",
  "fact_check",
  "legal_review",
  "scheduled",
  "published",
  "archived",
] as const;

export type ContentProductionSection = {
  articlesCreated: MetricResult<number>;
  articlesPublished: MetricResult<number>;
  byWorkflowStatus: MetricResult<Record<string, number>>;
  eventsCreated: MetricResult<number>;
};

export type ContentMixSection = {
  byCategory: MetricResult<Array<{ category: string; count: number }>>;
  byRegion: MetricResult<Array<{ region: string; count: number }>>;
  byLanguage: MetricResult<Array<{ language: string; count: number }>>;
};

export type FreshnessSection = {
  avgEventToPublishMinutes: MetricResult<number | null>;
  publishedWithoutEventLink: MetricResult<number>;
  oldestUnpublishedDraftHours: MetricResult<number | null>;
};

export type QualitySection = {
  missingHeroImage: MetricResult<number>;
  missingSummary: MetricResult<number>;
  emptyArticleBody: MetricResult<number>;
  missingReadingTime: MetricResult<number>;
  workflowRejections: MetricResult<number>;
};

export type AiProviderUsageSection = {
  totalRequests: MetricResult<number>;
  successRate: MetricResult<number | null>;
  byProvider: MetricResult<
    Array<{
      provider: string;
      requests: number;
      success: number;
      failed: number;
      estimatedCostUsd: number;
    }>
  >;
  fallbackEvents: MetricResult<number>;
  totalEstimatedCostUsd: MetricResult<number>;
};

export type EmbeddingsClusteringSection = {
  embeddingsCreatedOpenAi: MetricResult<number>;
  embeddingsCreatedCloudflare: MetricResult<number>;
  eventsWithMultipleSources: MetricResult<number>;
  avgSourceCountPerEvent: MetricResult<number | null>;
};

export type ImagesSection = {
  queued: MetricResult<number>;
  completed: MetricResult<number>;
  failed: MetricResult<number>;
  pending: MetricResult<number>;
};

export type PipelineInfrastructureSection = {
  jobsCompleted: MetricResult<number>;
  jobsFailed: MetricResult<number>;
  deadLetters: MetricResult<number>;
  cronRuns: MetricResult<
    Array<{ job: string; ok: number; degraded: number; failed: number; total: number }>
  >;
  errorEventsBySeverity: MetricResult<Record<string, number>>;
};

/** No GSC/GA integration exists yet — every field is explicitly unavailable, never fabricated. */
export type AudienceSeoSection = {
  searchImpressions: MetricResult<number>;
  searchClicks: MetricResult<number>;
  searchAvgPosition: MetricResult<number>;
  pageviews: MetricResult<number>;
  note: string;
};

export type DeterministicReport = {
  reportDate: string;
  windowStartIso: string;
  windowEndIso: string;
  collectedAt: string;
  content_production: ContentProductionSection;
  content_mix: ContentMixSection;
  freshness: FreshnessSection;
  quality: QualitySection;
  ai_provider_usage: AiProviderUsageSection;
  embeddings_clustering: EmbeddingsClusteringSection;
  images: ImagesSection;
  pipeline_infrastructure: PipelineInfrastructureSection;
  audience_seo: AudienceSeoSection;
};

function unavailableSupabase<T>(): MetricResult<T> {
  return unavailable("supabase_not_configured");
}

function groupCount<T>(rows: T[], keyFn: (row: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

async function collectContentProduction(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<ContentProductionSection> {
  const articlesCreated = await safe("content_production.articlesCreated", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const articlesPublished = await safe("content_production.articlesPublished", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .eq("workflow_status", "published")
      .gte("published_at", startIso)
      .lt("published_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const byWorkflowStatus = await safe("content_production.byWorkflowStatus", async () => {
    const counts: Record<string, number> = {};
    for (const status of WORKFLOW_STATUSES) {
      const { count, error } = await supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .eq("workflow_status", status)
        .gte("created_at", startIso)
        .lt("created_at", endIso);
      if (error) throw new Error(error.message);
      counts[status] = count ?? 0;
    }
    return counts;
  });

  const eventsCreated = await safe("content_production.eventsCreated", async () => {
    const { count, error } = await supabase
      .from("news_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  return { articlesCreated, articlesPublished, byWorkflowStatus, eventsCreated };
}

async function collectContentMix(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<ContentMixSection> {
  const byLanguage = await safe("content_mix.byLanguage", async () => {
    const { data, error } = await supabase
      .from("generated_articles")
      .select("language")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(2000);
    if (error) throw new Error(error.message);
    const counts = groupCount(
      data ?? [],
      (row) => (row as { language: string | null }).language ?? "unknown"
    );
    return Object.entries(counts).map(([language, count]) => ({ language, count }));
  });

  const categoryRegion = await safe(
    "content_mix.byCategory+byRegion",
    async () => {
      const { data: articles, error: articleErr } = await supabase
        .from("generated_articles")
        .select("event_id")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .not("event_id", "is", null)
        .limit(2000);
      if (articleErr) throw new Error(articleErr.message);

      const eventIds = [
        ...new Set((articles ?? []).map((a) => (a as { event_id: string }).event_id).filter(Boolean)),
      ];
      if (!eventIds.length) {
        return { byCategory: [], byRegion: [] };
      }

      const { data: events, error: eventErr } = await supabase
        .from("news_events")
        .select("id,category,region")
        .in("id", eventIds.slice(0, 2000));
      if (eventErr) throw new Error(eventErr.message);

      const categoryCounts = groupCount(
        events ?? [],
        (row) => (row as { category: string | null }).category ?? "uncategorized"
      );
      const regionCounts = groupCount(
        events ?? [],
        (row) => (row as { region: string | null }).region ?? "unspecified"
      );

      return {
        byCategory: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
        byRegion: Object.entries(regionCounts).map(([region, count]) => ({ region, count })),
      };
    }
  );

  return {
    byLanguage,
    byCategory:
      categoryRegion.status === "ok" ? ok(categoryRegion.value.byCategory) : unavailable(categoryRegion.reason),
    byRegion:
      categoryRegion.status === "ok" ? ok(categoryRegion.value.byRegion) : unavailable(categoryRegion.reason),
  };
}

async function collectFreshness(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<FreshnessSection> {
  const publishedWithoutEventLink = await safe(
    "freshness.publishedWithoutEventLink",
    async () => {
      const { count, error } = await supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .eq("workflow_status", "published")
        .is("event_id", null)
        .gte("published_at", startIso)
        .lt("published_at", endIso);
      if (error) throw new Error(error.message);
      return count ?? 0;
    }
  );

  const avgEventToPublishMinutes = await safe(
    "freshness.avgEventToPublishMinutes",
    async () => {
      const { data: articles, error: articleErr } = await supabase
        .from("generated_articles")
        .select("event_id,published_at")
        .eq("workflow_status", "published")
        .gte("published_at", startIso)
        .lt("published_at", endIso)
        .not("event_id", "is", null)
        .limit(2000);
      if (articleErr) throw new Error(articleErr.message);

      const rows = (articles ?? []) as Array<{ event_id: string; published_at: string }>;
      if (!rows.length) return null;

      const eventIds = [...new Set(rows.map((r) => r.event_id))];
      const { data: events, error: eventErr } = await supabase
        .from("news_events")
        .select("id,created_at")
        .in("id", eventIds.slice(0, 2000));
      if (eventErr) throw new Error(eventErr.message);

      const eventCreatedAt = new Map(
        (events ?? []).map((e) => [(e as { id: string }).id, (e as { created_at: string }).created_at])
      );

      const diffsMinutes: number[] = [];
      for (const row of rows) {
        const createdAt = eventCreatedAt.get(row.event_id);
        if (!createdAt) continue;
        const diffMs = new Date(row.published_at).getTime() - new Date(createdAt).getTime();
        if (Number.isFinite(diffMs) && diffMs >= 0) diffsMinutes.push(diffMs / 60_000);
      }
      if (!diffsMinutes.length) return null;
      return Math.round(diffsMinutes.reduce((a, b) => a + b, 0) / diffsMinutes.length);
    }
  );

  const oldestUnpublishedDraftHours = await safe(
    "freshness.oldestUnpublishedDraftHours",
    async () => {
      const { data, error } = await supabase
        .from("generated_articles")
        .select("created_at")
        .in("workflow_status", ["draft", "review", "fact_check", "legal_review", "scheduled"])
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw new Error(error.message);
      const oldest = data?.[0] as { created_at: string } | undefined;
      if (!oldest) return null;
      return Math.round((Date.now() - new Date(oldest.created_at).getTime()) / 3_600_000);
    }
  );

  return { avgEventToPublishMinutes, publishedWithoutEventLink, oldestUnpublishedDraftHours };
}

async function collectQuality(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<QualitySection> {
  const missingHeroImage = await safe("quality.missingHeroImage", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .is("hero_image_url", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const missingSummary = await safe("quality.missingSummary", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .is("summary", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const emptyArticleBody = await safe("quality.emptyArticleBody", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .is("article_body", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const missingReadingTime = await safe("quality.missingReadingTime", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .is("reading_time", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const workflowRejections = await safe("quality.workflowRejections", async () => {
    const { count, error } = await supabase
      .from("generated_articles")
      .select("id", { count: "exact", head: true })
      .not("workflow_rejection_reason", "is", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  return { missingHeroImage, missingSummary, emptyArticleBody, missingReadingTime, workflowRejections };
}

async function collectAiProviderUsage(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<AiProviderUsageSection> {
  const rowsResult = await safe("ai_provider_usage.rows", async () => {
    const { data, error } = await supabase
      .from("ai_provider_usage_events" as never)
      .select("provider,success,estimated_cost_usd,fallback_reason")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(10_000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      provider: string;
      success: boolean;
      estimated_cost_usd: number | null;
      fallback_reason: string | null;
    }>;
  });

  if (rowsResult.status === "unavailable") {
    return {
      totalRequests: unavailable(rowsResult.reason),
      successRate: unavailable(rowsResult.reason),
      byProvider: unavailable(rowsResult.reason),
      fallbackEvents: unavailable(rowsResult.reason),
      totalEstimatedCostUsd: unavailable(rowsResult.reason),
    };
  }

  const rows = rowsResult.value;
  const totalRequests = rows.length;
  const successCount = rows.filter((r) => r.success).length;
  const fallbackEvents = rows.filter((r) => !r.success && r.fallback_reason).length;
  const totalCost = rows.reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0);

  const byProviderMap = new Map<
    string,
    { requests: number; success: number; failed: number; estimatedCostUsd: number }
  >();
  for (const row of rows) {
    const entry = byProviderMap.get(row.provider) ?? {
      requests: 0,
      success: 0,
      failed: 0,
      estimatedCostUsd: 0,
    };
    entry.requests += 1;
    if (row.success) entry.success += 1;
    else entry.failed += 1;
    entry.estimatedCostUsd += Number(row.estimated_cost_usd ?? 0);
    byProviderMap.set(row.provider, entry);
  }

  return {
    totalRequests: ok(totalRequests),
    successRate: ok(totalRequests ? Math.round((successCount / totalRequests) * 1000) / 1000 : null),
    byProvider: ok(
      [...byProviderMap.entries()].map(([provider, v]) => ({
        provider,
        requests: v.requests,
        success: v.success,
        failed: v.failed,
        estimatedCostUsd: Math.round(v.estimatedCostUsd * 1e6) / 1e6,
      }))
    ),
    fallbackEvents: ok(fallbackEvents),
    totalEstimatedCostUsd: ok(Math.round(totalCost * 1e6) / 1e6),
  };
}

async function collectEmbeddingsClustering(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<EmbeddingsClusteringSection> {
  const embeddingsCreatedOpenAi = await safe("embeddings.openai", async () => {
    const { count, error } = await supabase
      .from("intelligence_embeddings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const embeddingsCreatedCloudflare = await safe("embeddings.cloudflare", async () => {
    const { count, error } = await supabase
      .from("intelligence_embeddings_cf" as never)
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const eventsWithMultipleSources = await safe("embeddings.eventsWithMultipleSources", async () => {
    const { count, error } = await supabase
      .from("news_events")
      .select("id", { count: "exact", head: true })
      .gt("source_count", 1)
      .gte("created_at", startIso)
      .lt("created_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const avgSourceCountPerEvent = await safe("embeddings.avgSourceCountPerEvent", async () => {
    const { data, error } = await supabase
      .from("news_events")
      .select("source_count")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(5000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ source_count: number | null }>;
    if (!rows.length) return null;
    const total = rows.reduce((s, r) => s + (r.source_count ?? 0), 0);
    return Math.round((total / rows.length) * 100) / 100;
  });

  return {
    embeddingsCreatedOpenAi,
    embeddingsCreatedCloudflare,
    eventsWithMultipleSources,
    avgSourceCountPerEvent,
  };
}

async function collectImages(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<ImagesSection> {
  async function countByStatus(status: string): Promise<MetricResult<number>> {
    return safe(`images.${status}`, async () => {
      const { count, error } = await supabase
        .from("editorial_image_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", status)
        .gte("created_at", startIso)
        .lt("created_at", endIso);
      if (error) throw new Error(error.message);
      return count ?? 0;
    });
  }

  const [queued, completed, failed, pending] = await Promise.all([
    countByStatus("processing"),
    countByStatus("completed"),
    countByStatus("failed"),
    countByStatus("pending"),
  ]);

  return { queued, completed, failed, pending };
}

async function collectPipelineInfrastructure(
  supabase: ReturnType<typeof createAdminServerClient>,
  startIso: string,
  endIso: string
): Promise<PipelineInfrastructureSection> {
  const jobsCompleted = await safe("pipeline.jobsCompleted", async () => {
    const { count, error } = await supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("updated_at", startIso)
      .lt("updated_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const jobsFailed = await safe("pipeline.jobsFailed", async () => {
    const { count, error } = await supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["failed", "dead"])
      .gte("updated_at", startIso)
      .lt("updated_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const deadLetters = await safe("pipeline.deadLetters", async () => {
    const { count, error } = await supabase
      .from("worker_dead_letters")
      .select("id", { count: "exact", head: true })
      .gte("failed_at", startIso)
      .lt("failed_at", endIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

  const cronRuns = await safe("pipeline.cronRuns", async () => {
    const { data, error } = await supabase
      .from("ops_cron_runs")
      .select("job,ok,degraded")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(5000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ job: string; ok: boolean; degraded: boolean | null }>;
    const byJob = new Map<string, { ok: number; degraded: number; failed: number; total: number }>();
    for (const row of rows) {
      const entry = byJob.get(row.job) ?? { ok: 0, degraded: 0, failed: 0, total: 0 };
      entry.total += 1;
      if (row.ok) entry.ok += 1;
      else entry.failed += 1;
      if (row.degraded) entry.degraded += 1;
      byJob.set(row.job, entry);
    }
    return [...byJob.entries()].map(([job, v]) => ({ job, ...v }));
  });

  const errorEventsBySeverity = await safe("pipeline.errorEventsBySeverity", async () => {
    const { data, error } = await supabase
      .from("ops_error_events")
      .select("severity")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .limit(10_000);
    if (error) throw new Error(error.message);
    return groupCount(
      (data ?? []) as Array<{ severity: string }>,
      (row) => row.severity ?? "unknown"
    );
  });

  return { jobsCompleted, jobsFailed, deadLetters, cronRuns, errorEventsBySeverity };
}

function collectAudienceSeo(): AudienceSeoSection {
  const reason =
    "No Google Search Console / Analytics integration is wired into the newsroom audit yet — do not fabricate.";
  return {
    searchImpressions: unavailable(reason),
    searchClicks: unavailable(reason),
    searchAvgPosition: unavailable(reason),
    pageviews: unavailable(reason),
    note: reason,
  };
}

/**
 * Collect deterministic Daily Newsroom Audit Report metrics for one IST
 * calendar day. `reportDate` is `YYYY-MM-DD` in Asia/Kolkata; internally
 * converted to a UTC `[start, end)` range via getIstDayBounds (same
 * convention used by /api/cron/district-coverage).
 */
export async function collectDailyMetrics(reportDate: string): Promise<DeterministicReport> {
  const bounds = getIstDayBounds(reportDate);
  const { startIso, endIso } = bounds;

  if (!isSupabaseConfigured()) {
    return {
      reportDate: bounds.day,
      windowStartIso: startIso,
      windowEndIso: endIso,
      collectedAt: new Date().toISOString(),
      content_production: {
        articlesCreated: unavailableSupabase(),
        articlesPublished: unavailableSupabase(),
        byWorkflowStatus: unavailableSupabase(),
        eventsCreated: unavailableSupabase(),
      },
      content_mix: {
        byCategory: unavailableSupabase(),
        byRegion: unavailableSupabase(),
        byLanguage: unavailableSupabase(),
      },
      freshness: {
        avgEventToPublishMinutes: unavailableSupabase(),
        publishedWithoutEventLink: unavailableSupabase(),
        oldestUnpublishedDraftHours: unavailableSupabase(),
      },
      quality: {
        missingHeroImage: unavailableSupabase(),
        missingSummary: unavailableSupabase(),
        emptyArticleBody: unavailableSupabase(),
        missingReadingTime: unavailableSupabase(),
        workflowRejections: unavailableSupabase(),
      },
      ai_provider_usage: {
        totalRequests: unavailableSupabase(),
        successRate: unavailableSupabase(),
        byProvider: unavailableSupabase(),
        fallbackEvents: unavailableSupabase(),
        totalEstimatedCostUsd: unavailableSupabase(),
      },
      embeddings_clustering: {
        embeddingsCreatedOpenAi: unavailableSupabase(),
        embeddingsCreatedCloudflare: unavailableSupabase(),
        eventsWithMultipleSources: unavailableSupabase(),
        avgSourceCountPerEvent: unavailableSupabase(),
      },
      images: {
        queued: unavailableSupabase(),
        completed: unavailableSupabase(),
        failed: unavailableSupabase(),
        pending: unavailableSupabase(),
      },
      pipeline_infrastructure: {
        jobsCompleted: unavailableSupabase(),
        jobsFailed: unavailableSupabase(),
        deadLetters: unavailableSupabase(),
        cronRuns: unavailableSupabase(),
        errorEventsBySeverity: unavailableSupabase(),
      },
      audience_seo: collectAudienceSeo(),
    };
  }

  const supabase = createAdminServerClient();

  const [
    content_production,
    content_mix,
    freshness,
    quality,
    ai_provider_usage,
    embeddings_clustering,
    images,
    pipeline_infrastructure,
  ] = await Promise.all([
    collectContentProduction(supabase, startIso, endIso),
    collectContentMix(supabase, startIso, endIso),
    collectFreshness(supabase, startIso, endIso),
    collectQuality(supabase, startIso, endIso),
    collectAiProviderUsage(supabase, startIso, endIso),
    collectEmbeddingsClustering(supabase, startIso, endIso),
    collectImages(supabase, startIso, endIso),
    collectPipelineInfrastructure(supabase, startIso, endIso),
  ]);

  return {
    reportDate: bounds.day,
    windowStartIso: startIso,
    windowEndIso: endIso,
    collectedAt: new Date().toISOString(),
    content_production,
    content_mix,
    freshness,
    quality,
    ai_provider_usage,
    embeddings_clustering,
    images,
    pipeline_infrastructure,
    audience_seo: collectAudienceSeo(),
  };
}
