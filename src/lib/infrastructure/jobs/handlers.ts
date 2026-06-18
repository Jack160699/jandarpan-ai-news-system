/**
 * Job handlers — embeddings, snapshots, clustering, DAM, analytics, SEO, translations
 */

import { buildEnterpriseAnalyticsReport } from "@/lib/analytics/enterprise-aggregate";
import { analyzeAssetWithAi } from "@/lib/dam/ai-analysis";
import { getDamAsset } from "@/lib/dam/store";
import {
  buildNewsroomIntelligenceSnapshot,
  saveIntelligenceSnapshot,
} from "@/lib/intelligence/build-snapshot";
import { clusterByEmbeddings } from "@/lib/intelligence/vector/semantic-cluster";
import { batchEmbedSignals } from "@/lib/intelligence/vector/vector-store";
import type { JobHandler, JobType } from "@/lib/infrastructure/jobs/types";
import { createAdminServerClient } from "@/lib/supabase";
import { asJson } from "@/types/json";
import { clusterRecentSignals } from "@/lib/newsroom";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";

async function loadSignalsForEmbed(
  tenantId: string | null,
  limit: number,
  signalIds?: string[]
) {
  const supabase = createAdminServerClient();

  // Explicit id list (re-embed on demand) — no backlog filtering.
  if (signalIds?.length) {
    let q = supabase
      .from("news_signals")
      .select("id, title, raw_content, provider")
      .in("id", signalIds)
      .limit(limit);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    const { data } = await q;
    return data ?? [];
  }

  // Skip signals that already have an embedding so the worker advances through
  // the backlog instead of re-embedding the newest N every run. Pull a bounded
  // window of candidate ids (oldest first), drop already-embedded ones, then
  // hydrate only the rows we will actually embed.
  const { data: embeddedRows } = await supabase
    .from("intelligence_embeddings")
    .select("entity_id")
    .eq("entity_type", "signal")
    .limit(20000);
  const embeddedIds = new Set((embeddedRows ?? []).map((r) => r.entity_id));

  let idQuery = supabase
    .from("news_signals")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(Math.max(limit * 20, 500));
  if (tenantId) idQuery = idQuery.eq("tenant_id", tenantId);

  const { data: candidateIds } = await idQuery;
  const pending = (candidateIds ?? [])
    .map((r) => r.id as string)
    .filter((id) => !embeddedIds.has(id))
    .slice(0, limit);

  if (pending.length === 0) return [];

  const { data } = await supabase
    .from("news_signals")
    .select("id, title, raw_content, provider")
    .in("id", pending);
  return data ?? [];
}

const embedSignals: JobHandler = async (job) => {
  if (process.env.NEWSROOM_USE_EMBEDDINGS === "false") {
    return { ok: true, result: { skipped: true, reason: "embeddings_disabled" } };
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: true, result: { skipped: true, reason: "no_openai" } };
  }

  const payload = job.payload;
  const limit = Number(payload.limit ?? 30);
  const signalIds = payload.signalIds as string[] | undefined;
  const signals = await loadSignalsForEmbed(job.tenant_id, limit, signalIds);

  const embedded = await batchEmbedSignals(
    signals.map((s) => ({
      id: s.id,
      title: s.title,
      raw_content: s.raw_content,
      provider: s.provider,
    })),
    job.tenant_id
  );

  if (signals.length > 0 && embedded === 0) {
    return {
      ok: true,
      result: {
        embedded,
        signalCount: signals.length,
        warning: "embed_batch_empty",
      },
    };
  }

  return { ok: true, result: { embedded, signalCount: signals.length } };
};

const embedArticles: JobHandler = async (job) => {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: true, result: { skipped: true } };
  }

  const { upsertEmbedding } = await import(
    "@/lib/intelligence/vector/vector-store"
  );
  const supabase = createAdminServerClient();
  const limit = Number(job.payload.limit ?? 15);

  let query = supabase
    .from("generated_articles")
    .select("id, headline, summary")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (job.tenant_id) query = query.eq("tenant_id", job.tenant_id);

  const { data: articles } = await query;
  let embedded = 0;

  for (const a of articles ?? []) {
    const text = `${a.headline} ${a.summary ?? ""}`.trim();
    const ok = await upsertEmbedding({
      tenantId: job.tenant_id,
      entityType: "article",
      entityId: a.id,
      text,
      metadata: { title: a.headline },
    });
    if (ok) embedded += 1;
  }

  return { ok: true, result: { embedded } };
};

const intelligenceSnapshot: JobHandler = async (job) => {
  const started = Date.now();
  const snapshot = await buildNewsroomIntelligenceSnapshot(job.tenant_id, {
    mode: "worker",
  });

  if (!snapshot) {
    return { ok: false, error: "snapshot_build_failed", retryable: true };
  }

  await saveIntelligenceSnapshot(job.tenant_id, snapshot, Date.now() - started);
  return {
    ok: true,
    result: {
      articlesAnalyzed: snapshot.summary.articlesAnalyzed,
      durationMs: Date.now() - started,
    },
  };
};

const intelligenceCluster: JobHandler = async (job) => {
  const signals = await loadSignalsForEmbed(job.tenant_id, 25);
  const clusters = await clusterByEmbeddings({
    items: signals.map((s) => ({ id: s.id, text: s.title })),
    threshold: 0.82,
  });

  await enqueueSnapshotRefresh(job.tenant_id);

  return {
    ok: true,
    result: {
      clusterCount: clusters.filter((c) => c.memberIds.length > 1).length,
    },
  };
};

const intelligenceSummary: JobHandler = async (job) => {
  const result = await intelligenceSnapshot(job);
  return result;
};

const seoAnalysis: JobHandler = async (job) => {
  await enqueueSnapshotRefresh(job.tenant_id);
  return { ok: true, result: { delegated: "intelligence_snapshot" } };
};

const translationBatch: JobHandler = async (job) => {
  await enqueueSnapshotRefresh(job.tenant_id);
  return { ok: true, result: { delegated: "intelligence_snapshot" } };
};

const damAnalyze: JobHandler = async (job) => {
  const assetId = job.payload.assetId as string | undefined;
  const tenantId = job.tenant_id;
  if (!assetId || !tenantId) {
    return { ok: false, error: "assetId_and_tenant_required", retryable: false };
  }

  const asset = await getDamAsset(tenantId, assetId);
  if (!asset) {
    return { ok: false, error: "asset_not_found", retryable: false };
  }

  let imageBase64: string | undefined;
  if (asset.mediaType === "image") {
    try {
      const res = await fetch(asset.publicUrl, { cache: "no-store" });
      const buf = Buffer.from(await res.arrayBuffer());
      imageBase64 = buf.toString("base64");
    } catch {
      /* skip */
    }
  }

  const analysis = await analyzeAssetWithAi({
    mediaType: asset.mediaType,
    mimeType: asset.mimeType,
    name: asset.name,
    imageBase64,
  });

  const supabase = createAdminServerClient();
  await supabase
    .from("dam_assets")
    .update({
      ai_tags: analysis.tags,
      ai_objects: analysis.objects,
      ai_ocr: analysis.ocr,
      ai_caption: analysis.caption,
      ai_faces: analysis.faces,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .eq("tenant_id", tenantId);

  await supabase
    .from("dam_analyze_queue")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("asset_id", assetId);

  return { ok: true, result: { assetId, tags: analysis.tags?.length ?? 0 } };
};

const analyticsAggregate: JobHandler = async (job) => {
  // Jobs are often enqueued without an explicit tenant; fall back to the
  // active pipeline tenant instead of hard-failing with tenant_required.
  const tenantId = job.tenant_id ?? getPipelineTenantId();
  if (!tenantId) {
    return { ok: false, error: "tenant_required", retryable: false };
  }

  const windowHours = Number(job.payload.windowHours ?? 168);
  const report = await buildEnterpriseAnalyticsReport(
    tenantId,
    windowHours
  );

  const supabase = createAdminServerClient();
  await supabase.from("analytics_snapshots").upsert(
    {
      tenant_id: tenantId,
      window_hours: windowHours,
      snapshot: asJson(report),
      built_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,window_hours" }
  );

  const { cacheSetJson } = await import("@/lib/infrastructure/cache");
  const { WORKER_CACHE_KEYS } = await import(
    "@/lib/infrastructure/cache/keys"
  );
  await cacheSetJson(
    WORKER_CACHE_KEYS.analytics(tenantId, windowHours),
    report,
    300
  );

  return { ok: true, result: { windowHours } };
};

const eventCluster: JobHandler = async (job) => {
  const limit = Number(job.payload.limit ?? 30);
  const result = await clusterRecentSignals(limit);
  return {
    ok: true,
    result: {
      eventsCreated: result.eventsCreated,
      duplicatesMerged: result.duplicatesMerged,
    },
  };
};

const editorialGenerate: JobHandler = async (job) => {
  if (process.env.NEWSROOM_GENERATE_ARTICLES !== "true") {
    return { ok: true, result: { skipped: true, reason: "generation_disabled" } };
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: true, result: { skipped: true, reason: "no_openai" } };
  }

  const limit = Number(job.payload.limit ?? INFRA_CONFIG.editorialBatchLimit);
  const result = await generateEditorialsFromEvents({ limit });

  if (result.published > 0) {
    const { revalidateNewsroomCaches } = await import(
      "@/lib/infrastructure/cache/isr"
    );
    await revalidateNewsroomCaches({ publishedStories: result.published });
  }

  return {
    ok: true,
    result: {
      published: result.published,
      generated: result.generated,
      rejected: result.rejected,
      repaired: result.repaired,
      skipped: result.skipped,
      errors: result.errors.slice(0, 5),
    },
  };
};

async function enqueueSnapshotRefresh(tenantId: string | null) {
  const { enqueueJob } = await import("@/lib/infrastructure/jobs/queue");
  await enqueueJob({
    jobType: "intelligence_snapshot",
    dedupeKey: `intelligence_snapshot:${tenantId ?? "global"}`,
    tenantId,
    priority: 8,
  });
}

export const JOB_HANDLERS = new Map<JobType, JobHandler>([
  ["embed_signals", embedSignals],
  ["embed_articles", embedArticles],
  ["editorial_generate", editorialGenerate],
  ["intelligence_snapshot", intelligenceSnapshot],
  ["intelligence_cluster", intelligenceCluster],
  ["intelligence_summary", intelligenceSummary],
  ["seo_analysis", seoAnalysis],
  ["translation_batch", translationBatch],
  ["dam_analyze", damAnalyze],
  ["analytics_aggregate", analyticsAggregate],
  ["event_cluster", eventCluster],
]);
