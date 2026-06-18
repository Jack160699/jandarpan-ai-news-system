/**
 * Durable event bus — pub/sub with deduplication for worker orchestration
 */

import { createAdminClient } from "@/lib/supabase";
import { asJsonObject, jsonObjectFrom, type JsonObject } from "@/types/json";
import { enqueueJob } from "@/lib/infrastructure/jobs/queue";
import type { JobType } from "@/lib/infrastructure/jobs/types";

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

      for (const jobType of jobs) {
        const dedupeKey = `${jobType}:${tenantId ?? "global"}:${event.dedupe_key ?? event.id}`;
        await enqueueJob({
          jobType,
          dedupeKey,
          tenantId,
          payload: { ...payload, sourceEventId: event.id },
          priority: jobType === "intelligence_snapshot" ? 5 : 0,
        });
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
