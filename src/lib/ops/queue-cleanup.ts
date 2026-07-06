/**
 * Phase 4 queue cleanup — audit stale work and safely remove obsolete pending jobs.
 * Does not change queue design, workers, or business logic.
 */

import { createAdminClient } from "@/lib/supabase";
import {
  getEditorialImageMeta,
  isTerminalEditorialImageSource,
} from "@/lib/news/ai/editorial-image-terminal";
import { computeDrainPerHour, computeQueueEta } from "@/lib/infrastructure/queue/tuning";
import { getMetricsDashboard } from "@/lib/observability/metrics";
import { parseAiQueueRetryMeta } from "@/lib/news/ai/ai-queue-retry";
import type { Json } from "@/types/supabase";

const STALE_AGE_MS = 48 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

export type QueueStatusBreakdown = {
  pending: number;
  processing: number;
  retry: number;
  completed: number;
  dead: number;
  averageAgeHours: number | null;
  oldestJobAt: string | null;
};

export type QueueAuditReport = {
  ai: QueueStatusBreakdown;
  image: QueueStatusBreakdown;
  translation: QueueStatusBreakdown;
  embedding: QueueStatusBreakdown;
  worker: QueueStatusBreakdown;
  timestamp: string;
};

export type StaleReason =
  | "entity_missing"
  | "already_published"
  | "already_translated"
  | "image_already_generated"
  | "already_enriched"
  | "older_than_48h"
  | "superseded"
  | "production_reset";

export type StaleCounts = {
  ai: Record<StaleReason, number> & { total: number };
  image: Record<StaleReason, number> & { total: number };
  translation: Record<StaleReason, number> & { total: number };
  embedding: Record<StaleReason, number> & { total: number };
  worker: Record<StaleReason, number> & { total: number };
  grandTotal: number;
};

export type CleanupResult = {
  dryRun: boolean;
  removed: { ai: number; image: number; translation: number; embedding: number; worker: number; total: number };
  archived: number;
  staleCounts: StaleCounts;
  remaining: QueueAuditReport;
  health: PostCleanupHealth;
};

export type PostCleanupHealth = {
  aiPending: number;
  imagesPending: number;
  translationPending: number;
  workerPending: number;
  aiDrainPerHour: number;
  editorialDrainPerHour: number;
  aiEtaLabel: string;
  editorialEtaLabel: string;
  expectedDashboardStatus: "healthy" | "degraded" | "unhealthy";
  backlogElevated: boolean;
};

function emptyReasons(): Record<StaleReason, number> {
  return {
    entity_missing: 0,
    already_published: 0,
    already_translated: 0,
    image_already_generated: 0,
    already_enriched: 0,
    older_than_48h: 0,
    superseded: 0,
    production_reset: 0,
  };
}

function avgAgeHours(dates: string[]): number | null {
  if (!dates.length) return null;
  const now = Date.now();
  const sum = dates.reduce((a, d) => a + (now - new Date(d).getTime()), 0);
  return Math.round((sum / dates.length / 3_600_000) * 10) / 10;
}

function oldestDate(dates: string[]): string | null {
  if (!dates.length) return null;
  return dates.reduce((a, b) => (a < b ? a : b));
}

type QueueTable = "news_ai_queue" | "editorial_image_queue" | "worker_jobs";

async function countByStatus(table: QueueTable): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const statuses = ["pending", "processing", "completed", "failed", "claimed", "dead"];
  const counts = new Map<string, number>();

  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (count) counts.set(status, count);
    })
  );

  return counts;
}

async function getAgeStatsForTable(
  table: QueueTable,
  statusFilter?: string
): Promise<{ averageAgeHours: number | null; oldestJobAt: string | null }> {
  const supabase = createAdminClient();
  let oldestQuery = supabase
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1);

  if (statusFilter) oldestQuery = oldestQuery.eq("status", statusFilter);

  const { data: oldest } = await oldestQuery;

  let sampleQuery = supabase.from(table).select("created_at");
  if (statusFilter) sampleQuery = sampleQuery.eq("status", statusFilter);
  const { data: sample } = await sampleQuery.limit(200);

  const dates = (sample ?? []).map((r) => r.created_at as string);
  return {
    averageAgeHours: avgAgeHours(dates),
    oldestJobAt: (oldest?.[0]?.created_at as string | undefined) ?? oldestDate(dates),
  };
}

function breakdownFromCounts(
  counts: Map<string, number>,
  age: { averageAgeHours: number | null; oldestJobAt: string | null },
  options?: { retryFromFailed?: number; deadCount?: number }
): QueueStatusBreakdown {
  return {
    pending: counts.get("pending") ?? 0,
    processing: (counts.get("processing") ?? 0) + (counts.get("claimed") ?? 0),
    retry: options?.retryFromFailed ?? counts.get("failed") ?? 0,
    completed: counts.get("completed") ?? 0,
    dead: options?.deadCount ?? counts.get("dead") ?? 0,
    averageAgeHours: age.averageAgeHours,
    oldestJobAt: age.oldestJobAt,
  };
}

export async function auditAllQueues(): Promise<QueueAuditReport> {
  const supabase = createAdminClient();

  const [
    aiCounts,
    imageCounts,
    workerCounts,
    translatePending,
    translateClaimed,
    translateFailed,
    translateDead,
    embedPending,
    embedClaimed,
    embedFailed,
    embedDead,
    aiAge,
    imageAge,
    workerAge,
    translateAge,
    embedAge,
    aiFailedRetry,
    aiDead,
  ] = await Promise.all([
    countByStatus("news_ai_queue"),
    countByStatus("editorial_image_queue"),
    countByStatus("worker_jobs"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["translate_article", "translation_batch"])
      .eq("status", "pending"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["translate_article", "translation_batch"])
      .eq("status", "claimed"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["translate_article", "translation_batch"])
      .in("status", ["failed"]),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["translate_article", "translation_batch"])
      .eq("status", "dead"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["embed_signals", "embed_articles"])
      .eq("status", "pending"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["embed_signals", "embed_articles"])
      .eq("status", "claimed"),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["embed_signals", "embed_articles"])
      .in("status", ["failed"]),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["embed_signals", "embed_articles"])
      .eq("status", "dead"),
    getAgeStatsForTable("news_ai_queue", "pending"),
    getAgeStatsForTable("editorial_image_queue", "pending"),
    getAgeStatsForTable("worker_jobs", "pending"),
    (async () => {
      const { data } = await supabase
        .from("worker_jobs")
        .select("created_at")
        .in("job_type", ["translate_article", "translation_batch"])
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(200);
      const dates = (data ?? []).map((r) => r.created_at);
      const { data: oldest } = await supabase
        .from("worker_jobs")
        .select("created_at")
        .in("job_type", ["translate_article", "translation_batch"])
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);
      return {
        averageAgeHours: avgAgeHours(dates),
        oldestJobAt: oldest?.[0]?.created_at ?? oldestDate(dates),
      };
    })(),
    (async () => {
      const { data } = await supabase
        .from("worker_jobs")
        .select("created_at")
        .in("job_type", ["embed_signals", "embed_articles"])
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(200);
      const dates = (data ?? []).map((r) => r.created_at);
      const { data: oldest } = await supabase
        .from("worker_jobs")
        .select("created_at")
        .in("job_type", ["embed_signals", "embed_articles"])
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);
      return {
        averageAgeHours: avgAgeHours(dates),
        oldestJobAt: oldest?.[0]?.created_at ?? oldestDate(dates),
      };
    })(),
    supabase
      .from("news_ai_queue")
      .select("error")
      .eq("status", "failed")
      .limit(500)
      .then(({ data }) =>
        (data ?? []).filter((r) => {
          const meta = parseAiQueueRetryMeta(r.error);
          return meta && !meta.dead;
        }).length
      ),
    supabase
      .from("news_ai_queue")
      .select("error")
      .eq("status", "failed")
      .limit(500)
      .then(({ data }) =>
        (data ?? []).filter((r) => parseAiQueueRetryMeta(r.error)?.dead).length
      ),
  ]);

  const translationCounts = new Map<string, number>([
    ["pending", translatePending.count ?? 0],
    ["claimed", translateClaimed.count ?? 0],
    ["failed", translateFailed.count ?? 0],
    ["dead", translateDead.count ?? 0],
  ]);

  const embeddingCounts = new Map<string, number>([
    ["pending", embedPending.count ?? 0],
    ["claimed", embedClaimed.count ?? 0],
    ["failed", embedFailed.count ?? 0],
    ["dead", embedDead.count ?? 0],
  ]);

  return {
    ai: breakdownFromCounts(aiCounts, aiAge, {
      retryFromFailed: aiFailedRetry,
      deadCount: aiDead,
    }),
    image: breakdownFromCounts(imageCounts, imageAge),
    translation: breakdownFromCounts(translationCounts, translateAge),
    embedding: breakdownFromCounts(embeddingCounts, embedAge),
    worker: breakdownFromCounts(workerCounts, workerAge),
    timestamp: new Date().toISOString(),
  };
}

type StaleCandidate = {
  id: string;
  table: QueueTable;
  jobType?: string;
  status: string;
  reasons: StaleReason[];
  payload?: Json;
};

function canRemove(candidate: StaleCandidate): boolean {
  if (candidate.status === "processing" || candidate.status === "claimed") return false;
  if (!candidate.reasons.length) return false;
  const nonAgeOnly =
    candidate.reasons.some((r) => r !== "older_than_48h") || candidate.reasons.length > 1;
  if (candidate.reasons.includes("older_than_48h") || nonAgeOnly) return true;
  return false;
}

async function classifyAiStale(): Promise<StaleCandidate[]> {
  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_AGE_MS).toISOString();
  const candidates: StaleCandidate[] = [];

  let offset = 0;
  while (true) {
    const { data: rows } = await supabase
      .from("news_ai_queue")
      .select("id, article_id, status, created_at, error")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (!rows?.length) break;

    const articleIds = rows.map((r) => r.article_id);
    const { data: articles } = await supabase
      .from("news_articles")
      .select("id, article_url, ai_summary, created_at")
      .in("id", articleIds);

    const articleMap = new Map((articles ?? []).map((a) => [a.id, a]));
    const urls = [...new Set((articles ?? []).map((a) => a.article_url).filter(Boolean))];

    const { data: newerByUrl } = urls.length
      ? await supabase
          .from("news_articles")
          .select("article_url, created_at, ai_summary")
          .in("article_url", urls)
          .not("ai_summary", "is", null)
      : { data: [] };

    const enrichedUrlSet = new Set((newerByUrl ?? []).map((a) => a.article_url));

    for (const row of rows) {
      const reasons: StaleReason[] = [];
      const article = articleMap.get(row.article_id);

      if (!article) {
        reasons.push("entity_missing");
      } else {
        if (article.ai_summary) reasons.push("already_enriched");
        if (row.created_at < staleCutoff) reasons.push("older_than_48h");
        if (enrichedUrlSet.has(article.article_url)) {
          const articleCreated = article.created_at ?? "";
          const newer = (newerByUrl ?? []).find(
            (a) =>
              a.article_url === article.article_url &&
              (a.created_at ?? "") > articleCreated &&
              a.ai_summary
          );
          if (newer && (newer.created_at ?? "") !== articleCreated) {
            reasons.push("superseded");
          }
        }
      }

      if (reasons.length) {
        candidates.push({
          id: row.id,
          table: "news_ai_queue",
          status: row.status,
          reasons: [...new Set(reasons)],
          payload: { article_id: row.article_id },
        });
      }
    }

    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return candidates.filter(canRemove);
}

async function classifyImageStale(): Promise<StaleCandidate[]> {
  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_AGE_MS).toISOString();
  const now = new Date().toISOString();
  const candidates: StaleCandidate[] = [];

  let offset = 0;
  while (true) {
    const { data: rows } = await supabase
      .from("editorial_image_queue")
      .select("id, generated_article_id, status, created_at, scheduled_at, hero_image_url")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (!rows?.length) break;

    const articleIds = rows.map((r) => r.generated_article_id);
    const { data: articles } = await supabase
      .from("generated_articles")
      .select("id, event_id, hero_image_url, published_at, created_at, editorial_status, editorial_metadata")
      .in("id", articleIds);

    const articleMap = new Map((articles ?? []).map((a) => [a.id, a]));
    const eventIds = [...new Set((articles ?? []).map((a) => a.event_id).filter(Boolean))] as string[];

    const { data: newerByEvent } = eventIds.length
      ? await supabase
          .from("generated_articles")
          .select("id, event_id, created_at, hero_image_url, editorial_metadata")
          .in("event_id", eventIds)
          .not("hero_image_url", "is", null)
      : { data: [] };

    for (const row of rows) {
      if (row.scheduled_at && row.scheduled_at > now) continue;

      const reasons: StaleReason[] = [];
      const article = articleMap.get(row.generated_article_id);

      if (!article) {
        reasons.push("entity_missing");
      } else {
        const imageSource = getEditorialImageMeta(article.editorial_metadata).source;
        if (isTerminalEditorialImageSource(imageSource)) {
          reasons.push("image_already_generated");
        }
        if (article.published_at && isTerminalEditorialImageSource(imageSource)) {
          reasons.push("already_published");
        }
        if (row.created_at < staleCutoff) reasons.push("older_than_48h");

        if (article.event_id) {
          const superseding = (newerByEvent ?? []).find(
            (a) =>
              a.event_id === article.event_id &&
              a.id !== article.id &&
              a.created_at > article.created_at &&
              isTerminalEditorialImageSource(
                getEditorialImageMeta(a.editorial_metadata).source
              )
          );
          if (superseding) reasons.push("superseded");
        }
      }

      if (reasons.length) {
        candidates.push({
          id: row.id,
          table: "editorial_image_queue",
          jobType: "editorial_images",
          status: row.status,
          reasons: [...new Set(reasons)],
          payload: { generated_article_id: row.generated_article_id },
        });
      }
    }

    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return candidates.filter(canRemove);
}

function hasTranslationBundle(
  editorialMetadata: unknown,
  translations: unknown,
  target: string
): boolean {
  const meta = editorialMetadata as { translations?: Record<string, { headline?: string; summary?: string; article_body?: string }> } | null;
  const col = translations as Record<string, { headline?: string; summary?: string; article_body?: string }> | null;
  const bundle = col?.[target] ?? meta?.translations?.[target];
  return Boolean(
    bundle?.headline?.trim() &&
      bundle?.summary?.trim() &&
      bundle?.article_body?.trim()
  );
}

const TRANSLATION_TYPES = ["translate_article", "translation_batch"] as const;
const EMBEDDING_TYPES = ["embed_signals", "embed_articles"] as const;

async function classifyWorkerStale(
  queueKey: "translation" | "embedding" | "worker"
): Promise<StaleCandidate[]> {
  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_AGE_MS).toISOString();
  const now = new Date().toISOString();
  const candidates: StaleCandidate[] = [];

  let offset = 0;
  while (true) {
    let query = supabase
      .from("worker_jobs")
      .select("id, job_type, status, payload, created_at, scheduled_at, dedupe_key")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (queueKey === "translation") {
      query = query.in("job_type", [...TRANSLATION_TYPES]);
    } else if (queueKey === "embedding") {
      query = query.in("job_type", [...EMBEDDING_TYPES]);
    } else {
      query = query.not(
        "job_type",
        "in",
        `(${[...TRANSLATION_TYPES, ...EMBEDDING_TYPES].join(",")})`
      );
    }

    const { data: rows } = await query;
    if (!rows?.length) break;

    const articleIds = rows
      .map((r) => {
        const p = r.payload as { articleId?: string };
        return p?.articleId;
      })
      .filter(Boolean) as string[];

    const { data: articles } = articleIds.length
      ? await supabase
          .from("generated_articles")
          .select("id, language, editorial_metadata, translations, published_at, editorial_status, event_id, hero_image_url")
          .in("id", articleIds)
      : { data: [] };

    const articleMap = new Map((articles ?? []).map((a) => [a.id, a]));

    const signalIds = rows
      .flatMap((r) => {
        const p = r.payload as { signalIds?: string[] };
        return p?.signalIds ?? [];
      })
      .filter(Boolean);

    const { data: embedded } = signalIds.length
      ? await supabase
          .from("intelligence_embeddings")
          .select("entity_id")
          .eq("entity_type", "signal")
          .in("entity_id", signalIds)
      : { data: [] };

    const embeddedSignals = new Set((embedded ?? []).map((e) => e.entity_id));

    const embedArticleIds = rows
      .filter((r) => r.job_type === "embed_articles")
      .map((r) => String((r.payload as { articleId?: string }).articleId ?? ""))
      .filter(Boolean);

    const { data: embeddedArticles } = embedArticleIds.length
      ? await supabase
          .from("intelligence_embeddings")
          .select("entity_id")
          .eq("entity_type", "article")
          .in("entity_id", embedArticleIds)
      : { data: [] };

    const embeddedArticleIds = new Set((embeddedArticles ?? []).map((e) => e.entity_id));

    const eventIds = rows
      .map((r) => {
        const p = r.payload as { eventId?: string };
        return p?.eventId;
      })
      .filter(Boolean) as string[];

    const { data: existingEditorials } = eventIds.length
      ? await supabase
          .from("generated_articles")
          .select("event_id")
          .in("event_id", eventIds)
      : { data: [] };

    const eventsWithEditorial = new Set((existingEditorials ?? []).map((e) => e.event_id));

    for (const row of rows) {
      if (row.scheduled_at && row.scheduled_at > now) continue;

      const reasons: StaleReason[] = [];
      const payload = row.payload as Record<string, unknown>;

      if (row.job_type === "translate_article") {
        const articleId = String(payload.articleId ?? "");
        const target = String(payload.targetLanguage ?? "en");
        const article = articleMap.get(articleId);

        if (!article) {
          reasons.push("entity_missing");
        } else {
          if (hasTranslationBundle(article.editorial_metadata, article.translations, target)) {
            reasons.push("already_translated");
          }
          if (article.published_at && article.editorial_status === "approved") {
            if (hasTranslationBundle(article.editorial_metadata, article.translations, target)) {
              reasons.push("already_published");
            }
          }
        }
      } else if (row.job_type === "translation_batch") {
        if (row.created_at < staleCutoff) reasons.push("older_than_48h");
      } else if (row.job_type === "embed_signals") {
        const ids = (payload.signalIds as string[] | undefined) ?? [];
        if (ids.length && ids.every((id) => embeddedSignals.has(id))) {
          reasons.push("already_enriched");
        }
        if (!ids.length && row.created_at < staleCutoff) reasons.push("older_than_48h");
      } else if (row.job_type === "embed_articles") {
        const articleId = String(payload.articleId ?? "");
        if (articleId && embeddedArticleIds.has(articleId)) {
          reasons.push("already_enriched");
        }
        if (row.created_at < staleCutoff) reasons.push("older_than_48h");
      } else if (row.job_type === "editorial_generate") {
        const eventId = String(payload.eventId ?? "");
        if (eventId && eventsWithEditorial.has(eventId)) {
          reasons.push("superseded");
        }
        if (!eventId) reasons.push("entity_missing");
      } else if (row.created_at < staleCutoff) {
        reasons.push("older_than_48h");
      }

      if (row.created_at < staleCutoff && !reasons.includes("older_than_48h")) {
        reasons.push("older_than_48h");
      }

      if (reasons.length) {
        candidates.push({
          id: row.id,
          table: "worker_jobs",
          jobType: row.job_type,
          status: row.status,
          reasons: [...new Set(reasons)],
          payload: row.payload as Json,
        });
      }
    }

    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return candidates.filter(canRemove);
}

function summarizeStale(
  ai: StaleCandidate[],
  image: StaleCandidate[],
  translation: StaleCandidate[],
  embedding: StaleCandidate[],
  worker: StaleCandidate[]
): StaleCounts {
  const sum = (items: StaleCandidate[]) => {
    const counts = emptyReasons();
    for (const item of items) {
      for (const r of item.reasons) counts[r] += 1;
    }
    return { ...counts, total: items.length };
  };

  const aiSum = sum(ai);
  const imageSum = sum(image);
  const transSum = sum(translation);
  const embedSum = sum(embedding);
  const workerSum = sum(worker);

  return {
    ai: aiSum,
    image: imageSum,
    translation: transSum,
    embedding: embedSum,
    worker: workerSum,
    grandTotal:
      aiSum.total + imageSum.total + transSum.total + embedSum.total + workerSum.total,
  };
}

async function archiveAndRemove(
  candidates: StaleCandidate[],
  dryRun: boolean,
  archivePhase: "phase4_cleanup" | "production_reset" = "phase4_cleanup"
): Promise<{ removed: number; archived: number }> {
  if (!candidates.length || dryRun) {
    return { removed: dryRun ? 0 : 0, archived: 0 };
  }

  const supabase = createAdminClient();
  let archived = 0;
  let removed = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const archiveRows = batch.map((c) => ({
      source_table: c.table,
      source_id: c.id,
      job_type: c.jobType ?? null,
      payload: (c.payload ?? {}) as Json,
      stale_reasons: c.reasons,
      original_status: c.status,
      metadata: { phase: archivePhase },
    }));

    // Archive table added in migration 044 — cast until types are regenerated
    const { error: archiveError } = await (supabase as ReturnType<typeof createAdminClient>)
      .from("queue_cleanup_archive" as "worker_jobs")
      .insert(archiveRows as never);

    if (archiveError) {
      const missingTable =
        archiveError.message.includes("does not exist") ||
        archiveError.message.includes("Could not find the table");
      if (missingTable) {
        console.warn("[queue-cleanup] archive table missing — deleting without archive");
      } else {
        throw new Error(`archive_failed:${archiveError.message}`);
      }
    } else {
      archived += batch.length;
    }

    const byTable = new Map<QueueTable, string[]>();
    for (const c of batch) {
      const ids = byTable.get(c.table) ?? [];
      ids.push(c.id);
      byTable.set(c.table, ids);
    }

    for (const [table, ids] of byTable) {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .in("id", ids)
        .in("status", ["pending", "failed"]);

      if (error) throw new Error(`delete_failed:${table}:${error.message}`);
      removed += count ?? 0;
    }
  }

  return { removed, archived };
}

export async function computePostCleanupHealth(): Promise<PostCleanupHealth> {
  const supabase = createAdminClient();
  const metrics = await getMetricsDashboard().catch(() => null);

  const [
    aiPending,
    imagesPending,
    translatePending,
    workerPending,
  ] = await Promise.all([
    supabase
      .from("news_ai_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
    supabase
      .from("editorial_image_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .in("job_type", ["translate_article", "translation_batch"])
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
    supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then((r) => r.count ?? 0),
  ]);

  const aiDrain = metrics
    ? computeDrainPerHour(metrics.queueDrain, "ai_enrich")
    : 0;
  const editorialDrain = metrics
    ? computeDrainPerHour(metrics.queueDrain, "editorial_images")
    : 0;

  const aiEta = computeQueueEta(aiPending, aiDrain);
  const editorialEta = computeQueueEta(imagesPending, editorialDrain);
  const backlogElevated = aiPending > 500 || imagesPending > 200;

  return {
    aiPending,
    imagesPending,
    translationPending: translatePending,
    workerPending,
    aiDrainPerHour: aiDrain,
    editorialDrainPerHour: editorialDrain,
    aiEtaLabel: aiEta.etaLabel,
    editorialEtaLabel: editorialEta.etaLabel,
    expectedDashboardStatus: backlogElevated ? "degraded" : "healthy",
    backlogElevated,
  };
}

export async function runQueueCleanup(options?: {
  dryRun?: boolean;
}): Promise<CleanupResult> {
  const dryRun = options?.dryRun ?? true;

  const [aiStale, imageStale, translationStale, embeddingStale, workerStale] =
    await Promise.all([
      classifyAiStale(),
      classifyImageStale(),
      classifyWorkerStale("translation"),
      classifyWorkerStale("embedding"),
      classifyWorkerStale("worker"),
    ]);

  const staleCounts = summarizeStale(
    aiStale,
    imageStale,
    translationStale,
    embeddingStale,
    workerStale
  );

  const allCandidates = [
    ...aiStale,
    ...imageStale,
    ...translationStale,
    ...embeddingStale,
    ...workerStale,
  ];

  const { removed, archived } = await archiveAndRemove(allCandidates, dryRun);

  let actualRemoved = { ai: 0, image: 0, translation: 0, embedding: 0, worker: 0, total: 0 };

  if (!dryRun) {
    actualRemoved = {
      ai: aiStale.length,
      image: imageStale.length,
      translation: translationStale.length,
      embedding: embeddingStale.length,
      worker: workerStale.length,
      total: removed,
    };
  } else {
    actualRemoved = {
      ai: aiStale.length,
      image: imageStale.length,
      translation: translationStale.length,
      embedding: embeddingStale.length,
      worker: workerStale.length,
      total: allCandidates.length,
    };
  }

  const [remaining, health] = await Promise.all([
    auditAllQueues(),
    computePostCleanupHealth(),
  ]);

  return {
    dryRun,
    removed: actualRemoved,
    archived: dryRun ? 0 : archived,
    staleCounts,
    remaining,
    health,
  };
}

/** Freshness window — jobs newer than this may still be actionable wire enrichment */
const USEFUL_AI_AGE_MS = 6 * 60 * 60 * 1000;

export type AiJobAuditRow = {
  queueId: string;
  articleId: string;
  createdAt: string;
  articleExists: boolean;
  alreadyEnriched: boolean;
  wirePublished: boolean;
  relatedSignalId: string | null;
  relatedEventId: string | null;
  stillUseful: boolean;
};

export type RemainingAiAuditSummary = {
  total: number;
  oldest: string | null;
  newest: string | null;
  articleExists: number;
  articleMissing: number;
  alreadyEnriched: number;
  wirePublished: number;
  withRelatedEvent: number;
  stillUseful: number;
  notUseful: number;
  samples: AiJobAuditRow[];
};

export type ProductionResetResult = {
  dryRun: boolean;
  aiArchived: number;
  aiCancelled: number;
  workerArchived: number;
  workerKept: number;
  remaining: QueueAuditReport;
  health: PostCleanupHealth;
  aiAudit: RemainingAiAuditSummary;
};

export async function auditRemainingAiJobs(): Promise<RemainingAiAuditSummary> {
  const supabase = createAdminClient();
  const usefulCutoff = new Date(Date.now() - USEFUL_AI_AGE_MS).toISOString();

  const { data: rows } = await supabase
    .from("news_ai_queue")
    .select("id, article_id, created_at, status")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (!rows?.length) {
    return {
      total: 0,
      oldest: null,
      newest: null,
      articleExists: 0,
      articleMissing: 0,
      alreadyEnriched: 0,
      wirePublished: 0,
      withRelatedEvent: 0,
      stillUseful: 0,
      notUseful: 0,
      samples: [],
    };
  }

  const articleIds = rows.map((r) => r.article_id);
  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, article_url, ai_summary, published_at, created_at")
    .in("id", articleIds);

  const articleMap = new Map((articles ?? []).map((a) => [a.id, a]));
  const urls = [
    ...new Set(
      (articles ?? [])
        .map((a) => a.article_url)
        .filter((u): u is string => typeof u === "string" && u.length > 0)
    ),
  ];

  const { data: signals } = urls.length
    ? await supabase
        .from("news_signals")
        .select("id, article_url")
        .in("article_url", urls)
    : { data: [] };

  const signalByUrl = new Map((signals ?? []).map((s) => [s.article_url, s]));
  const signalIds = (signals ?? []).map((s) => s.id);

  const eventBySignal = new Map<string, string>();
  if (signalIds.length) {
    const { data: events } = await supabase
      .from("news_events")
      .select("id, signal_ids")
      .limit(5000);
    for (const ev of events ?? []) {
      for (const sid of (ev.signal_ids as string[] | null) ?? []) {
        if (signalIds.includes(sid) && !eventBySignal.has(sid)) {
          eventBySignal.set(sid, ev.id);
        }
      }
    }
  }

  const auditRows: AiJobAuditRow[] = [];
  let articleExists = 0;
  let articleMissing = 0;
  let alreadyEnriched = 0;
  let wirePublished = 0;
  let withRelatedEvent = 0;
  let stillUseful = 0;

  for (const row of rows) {
    const article = articleMap.get(row.article_id);
    const exists = Boolean(article);
    const enriched = Boolean(article?.ai_summary);
    const published = Boolean(article?.published_at);
    const signal =
      article?.article_url ? signalByUrl.get(article.article_url) : null;
    const eventId = signal ? eventBySignal.get(signal.id) ?? null : null;

    if (exists) articleExists += 1;
    else articleMissing += 1;
    if (enriched) alreadyEnriched += 1;
    if (published) wirePublished += 1;
    if (eventId) withRelatedEvent += 1;

    const useful =
      exists &&
      !enriched &&
      row.created_at >= usefulCutoff;

    if (useful) stillUseful += 1;

    auditRows.push({
      queueId: row.id,
      articleId: String(row.article_id),
      createdAt: row.created_at,
      articleExists: exists,
      alreadyEnriched: enriched,
      wirePublished: published,
      relatedSignalId: signal?.id ?? null,
      relatedEventId: eventId,
      stillUseful: useful,
    });
  }

  const dates = rows.map((r) => r.created_at);

  return {
    total: rows.length,
    oldest: oldestDate(dates),
    newest: dates.reduce((a, b) => (a > b ? a : b)),
    articleExists,
    articleMissing,
    alreadyEnriched,
    wirePublished,
    withRelatedEvent,
    stillUseful,
    notUseful: rows.length - stillUseful,
    samples: auditRows.slice(0, 5),
  };
}

async function collectAllPendingAiCandidates(): Promise<StaleCandidate[]> {
  const supabase = createAdminClient();
  const candidates: StaleCandidate[] = [];
  let offset = 0;

  while (true) {
    const { data: rows } = await supabase
      .from("news_ai_queue")
      .select("id, article_id, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (!rows?.length) break;

    for (const row of rows) {
      candidates.push({
        id: row.id,
        table: "news_ai_queue",
        jobType: "ai_enrich",
        status: row.status,
        reasons: ["production_reset"],
        payload: { article_id: row.article_id, created_at: row.created_at },
      });
    }

    if (rows.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return candidates;
}

/** Archive stale backlog worker jobs; keep only future-scheduled active workers */
async function collectStaleWorkerCandidates(): Promise<{
  archive: StaleCandidate[];
  keep: Array<{ id: string; job_type: string; scheduled_at: string }>;
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from("worker_jobs")
    .select("id, job_type, status, payload, scheduled_at, created_at, dedupe_key")
    .eq("status", "pending");

  const archive: StaleCandidate[] = [];
  const keep: Array<{ id: string; job_type: string; scheduled_at: string }> = [];

  for (const row of pending ?? []) {
    const isFutureScheduled = row.scheduled_at > now;
    const isActiveBatch =
      row.job_type === "translation_batch" && isFutureScheduled;

    if (isActiveBatch) {
      keep.push({
        id: row.id,
        job_type: row.job_type,
        scheduled_at: row.scheduled_at,
      });
      continue;
    }

    archive.push({
      id: row.id,
      table: "worker_jobs",
      jobType: row.job_type,
      status: row.status,
      reasons: ["production_reset"],
      payload: row.payload as Json,
    });
  }

  return { archive, keep };
}

export async function runProductionQueueReset(options?: {
  dryRun?: boolean;
}): Promise<ProductionResetResult> {
  const dryRun = options?.dryRun ?? true;

  const [aiAudit, aiCandidates, workerResult] = await Promise.all([
    auditRemainingAiJobs(),
    collectAllPendingAiCandidates(),
    collectStaleWorkerCandidates(),
  ]);

  const allCandidates = [...aiCandidates, ...workerResult.archive];

  const { removed, archived } = await archiveAndRemove(
    allCandidates,
    dryRun,
    "production_reset"
  );

  const aiRemoved = dryRun ? 0 : Math.min(removed, aiCandidates.length);
  const workerRemoved = dryRun ? 0 : removed - aiRemoved;

  const [remaining, health] = await Promise.all([
    auditAllQueues(),
    computePostCleanupHealth(),
  ]);

  return {
    dryRun,
    aiArchived: dryRun ? 0 : Math.min(archived, aiCandidates.length),
    aiCancelled: dryRun ? aiCandidates.length : aiRemoved,
    workerArchived: dryRun ? 0 : workerRemoved,
    workerKept: workerResult.keep.length,
    remaining,
    health,
    aiAudit,
  };
}
