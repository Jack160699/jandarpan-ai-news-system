/**
 * Durable event bus — pub/sub with deduplication for worker orchestration
 */

import { createAdminClient } from "@/lib/supabase";
import { asJsonObject, jsonObjectFrom, type JsonObject } from "@/types/json";
import { enqueueJob } from "@/lib/infrastructure/jobs/queue";
import type { JobType } from "@/lib/infrastructure/jobs/types";
import { editorialJobQueuePriority } from "@/lib/infrastructure/workers/editorial-priority";

export type EventTopic =
  | "ingest.completed"
  | "signals.created"
  | "articles.published"
  | "intelligence.refresh"
  | "dam.asset.uploaded"
  | "analytics.refresh";

export type PublishEventInput = {
  topic: EventTopic;
  eventType: string;
  tenantId?: string | null;
  payload?: JsonObject;
  dedupeKey?: string;
};

/** Maps event topics to downstream job types */
const TOPIC_JOB_MAP: Partial<Record<EventTopic, JobType[]>> = {
  "ingest.completed": [
    "editorial_generate",
    "event_cluster",
    "intelligence_snapshot",
    "analytics_aggregate",
  ],
  "signals.created": ["embed_signals", "intelligence_cluster"],
  "articles.published": ["embed_articles", "seo_analysis", "intelligence_snapshot"],
  "intelligence.refresh": ["intelligence_snapshot"],
  "dam.asset.uploaded": ["dam_analyze"],
  "analytics.refresh": ["analytics_aggregate"],
};

export async function publishEvent(input: PublishEventInput): Promise<string | null> {
  const supabase = createAdminClient();

  const row = {
    tenant_id: input.tenantId ?? null,
    topic: input.topic,
    event_type: input.eventType,
    payload: input.payload ?? {},
    dedupe_key: input.dedupeKey ?? null,
    status: "pending" as const,
  };

  const { data, error } = await supabase
    .from("event_bus_messages")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    console.warn("[event-bus] publish:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function deliverPendingEvents(
  limit = 20
): Promise<{ delivered: number; failed: number }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from("event_bus_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return { delivered: 0, failed: 0 };

  let delivered = 0;
  let failed = 0;

  for (const event of pending) {
    await supabase
      .from("event_bus_messages")
      .update({ status: "processing" })
      .eq("id", event.id);

    try {
      const jobs = TOPIC_JOB_MAP[event.topic as EventTopic] ?? [];
      const tenantId = event.tenant_id as string | null;
      const payload = jsonObjectFrom(event.payload);

      const enqueueFailures: string[] = [];
      for (const jobType of jobs) {
        const dedupeKey = `${jobType}:${tenantId ?? "global"}:${event.dedupe_key ?? event.id}`;
        const jobId = await enqueueJob({
          jobType,
          dedupeKey,
          tenantId,
          payload: { ...payload, sourceEventId: event.id },
          priority:
            jobType === "intelligence_snapshot"
              ? 5
              : jobType === "editorial_generate"
                ? editorialJobQueuePriority(
                    payload as unknown as import("@/lib/types/newsroom").NewsEventRow
                  )
                : 0,
          timeoutMs: jobType === "editorial_generate" ? 90_000 : undefined,
        });
        if (!jobId) {
          enqueueFailures.push(jobType);
        }
      }

      if (enqueueFailures.length > 0) {
        throw new Error(`enqueue_failed:${enqueueFailures.join(",")}`);
      }

      await supabase
        .from("event_bus_messages")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      delivered += 1;
    } catch (err) {
      const attempts = (event.attempts ?? 0) + 1;
      const msg = err instanceof Error ? err.message : "delivery_failed";

      if (attempts >= (event.max_attempts ?? 3)) {
        await supabase
          .from("event_bus_messages")
          .update({ status: "failed", last_error: msg, attempts })
          .eq("id", event.id);
      } else {
        await supabase
          .from("event_bus_messages")
          .update({
            status: "pending",
            attempts,
            last_error: msg,
            scheduled_at: new Date(Date.now() + attempts * 5_000).toISOString(),
          })
          .eq("id", event.id);
      }
      failed += 1;
    }
  }

  return { delivered, failed };
}

export async function publishIngestCompleted(input: {
  tenantId?: string | null;
  signalsInserted: number;
  logId?: string | null;
}): Promise<void> {
  const dedupeKey = input.logId
    ? `ingest:${input.logId}`
    : `ingest:${Date.now()}`;

  await publishEvent({
    topic: "ingest.completed",
    eventType: "ingest.completed",
    tenantId: input.tenantId,
    dedupeKey,
    payload: asJsonObject({
      signalsInserted: input.signalsInserted,
      ...(input.logId != null ? { logId: input.logId } : {}),
    } as Record<string, unknown>),
  });
}

export async function publishSignalsCreated(input: {
  tenantId?: string | null;
  signalIds: string[];
  logId?: string | null;
}): Promise<void> {
  if (!input.signalIds.length) return;

  const dedupeKey = input.logId
    ? `signals:${input.logId}`
    : `signals:${input.signalIds[0]}`;

  await publishEvent({
    topic: "signals.created",
    eventType: "signals.created",
    tenantId: input.tenantId,
    dedupeKey,
    payload: asJsonObject({
      signalCount: input.signalIds.length,
      signalIds: input.signalIds.slice(0, 100),
      ...(input.logId != null ? { logId: input.logId } : {}),
    } as Record<string, unknown>),
  });
}

export async function publishArticlePublished(input: {
  articleId: string;
  tenantId: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("generated_articles")
    .select("id, tenant_id, editorial_metadata, headline, summary, article_body, slug, published_at, created_at, language, tags, hero_image_url")
    .eq("id", input.articleId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  const meta = (row?.editorial_metadata ?? {}) as Record<string, unknown>;
  const tier = Number(meta.cost_tier ?? (meta.cost_plan as { tier?: number } | undefined)?.tier);

  const tier1 = tier === 1;

  const { enqueueTranslationsForPublishedArticle } = await import(
    "@/lib/i18n/multilingual/translation-queue"
  );
  if (tier1) {
    void enqueueTranslationsForPublishedArticle(input.articleId, input.tenantId).catch(
      (err) => console.warn("[translation] publish enqueue:", err)
    );
  }

  if (
    tier1 &&
    process.env.NEWSROOM_AUTO_SHORTS === "true" &&
    process.env.OPENAI_API_KEY?.trim() &&
    row
  ) {
    const { buildNewsShortForArticle } = await import("@/lib/news/shorts/build-short");
    void buildNewsShortForArticle(row as never).catch(() => undefined);
  }

  // Tier 1 only: embeddings + SEO analysis + intelligence snapshot.
  if (tier1) {
    await publishEvent({
      topic: "articles.published",
      eventType: "articles.published",
      tenantId: input.tenantId,
      dedupeKey: `published:${input.articleId}`,
      payload: asJsonObject({
        articleId: input.articleId,
      }),
    });
  }
}
