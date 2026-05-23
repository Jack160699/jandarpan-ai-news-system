/**
 * Persist reader analytics events + optional daily rollups
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { logNewsroomAnalytics } from "@/lib/analytics/logger";
import { sanitizeEventMetadata } from "@/lib/analytics/privacy";
import type { ReaderEventInput } from "@/lib/analytics/types";

export async function persistReaderEvents(
  tenantId: string | null,
  sessionHash: string | null,
  events: ReaderEventInput[]
): Promise<{ ok: boolean; inserted: number }> {
  if (!events.length) return { ok: true, inserted: 0 };

  logNewsroomAnalytics({
    event: "batch_ingest",
    count: events.length,
    tenantId,
  });

  if (!isSupabaseConfigured()) {
    return { ok: true, inserted: events.length };
  }

  const rows = events.map((e) => ({
    tenant_id: tenantId,
    event_type: e.eventType,
    article_slug: e.articleSlug ?? null,
    session_hash: sessionHash,
    category: e.category ?? null,
    region: e.region ?? null,
    surface: e.surface ?? null,
    value_num: e.valueNum ?? null,
    metadata: sanitizeEventMetadata(e.metadata),
  }));

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("reader_analytics_events").insert(rows);

  if (error) {
    logNewsroomAnalytics({ event: "persist_failed", error: error.message });
    return { ok: false, inserted: 0 };
  }

  await upsertDailyRollups(tenantId, events);

  return { ok: true, inserted: rows.length };
}

async function upsertDailyRollups(
  tenantId: string | null,
  events: ReaderEventInput[]
) {
  if (!tenantId) return;

  const today = new Date().toISOString().slice(0, 10);
  const bySlug = new Map<
    string,
    {
      views: number;
      clicks: number;
      engagements: number;
      dwellMs: number;
      scrollSum: number;
      scrollN: number;
    }
  >();

  for (const e of events) {
    const slug = e.articleSlug;
    if (!slug) continue;
    const agg = bySlug.get(slug) ?? {
      views: 0,
      clicks: 0,
      engagements: 0,
      dwellMs: 0,
      scrollSum: 0,
      scrollN: 0,
    };

    if (e.eventType === "article_view") agg.views += 1;
    if (e.eventType === "article_click") {
      agg.clicks += 1;
      agg.engagements += 1;
    }
    if (e.eventType === "dwell" && e.valueNum) {
      agg.dwellMs += e.valueNum;
      agg.engagements += 1;
    }
    if (e.eventType === "scroll_depth" && e.valueNum != null) {
      agg.scrollSum += e.valueNum;
      agg.scrollN += 1;
      if (e.valueNum >= 75) agg.engagements += 1;
    }

    bySlug.set(slug, agg);
  }

  if (!bySlug.size) return;

  const supabase = createAdminServerClient();

  for (const [slug, agg] of bySlug) {
    const { data: existing } = await supabase
      .from("article_metrics_daily")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("article_slug", slug)
      .eq("bucket_date", today)
      .maybeSingle();

    const payload = {
      tenant_id: tenantId,
      article_slug: slug,
      bucket_date: today,
      views: (existing?.views ?? 0) + agg.views,
      clicks: (existing?.clicks ?? 0) + agg.clicks,
      engagements: (existing?.engagements ?? 0) + agg.engagements,
      total_dwell_ms: Number(existing?.total_dwell_ms ?? 0) + agg.dwellMs,
      scroll_samples: (existing?.scroll_samples ?? 0) + agg.scrollN,
      scroll_depth_sum:
        Number(existing?.scroll_depth_sum ?? 0) + agg.scrollSum,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("article_metrics_daily").upsert(payload, {
      onConflict: "tenant_id,article_slug,bucket_date",
    });
  }
}
