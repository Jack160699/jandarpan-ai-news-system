/**
 * Full dev newsroom cycle — RSS/API → signals → events → generated → homepage
 */

import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import type { OrchestrateResult } from "@/lib/infrastructure/cron/orchestrator";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import type { WorkerId, WorkerResult } from "@/lib/infrastructure/workers/types";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import {
  getNewsroomCycleLogs,
  logNewsroomCycle,
  resetNewsroomCycleLogs,
} from "@/lib/newsroom/debug/logger";
import {
  captureNewsroomSnapshot,
  type NewsroomSnapshot,
} from "@/lib/newsroom/debug/snapshot";

const DEV_PIPELINE: WorkerId[] = [
  "ingest",
  "ai_enrich",
  "editorial_generate",
  "editorial_images",
];

/** Per-stage budgets — dev cycle avoids single 52s cap starving editorial */
const DEV_STAGE_BUDGET_MS: Record<WorkerId, number> = {
  ingest: 90_000,
  ai_enrich: 30_000,
  editorial_generate: 120_000,
  editorial_images: 60_000,
  job_processor: 90_000,
  intelligence_embed: 60_000,
  intelligence_snapshot: 45_000,
  analytics_aggregate: 45_000,
  dam_analyze: 45_000,
  event_cluster: 45_000,
};

export type NewsroomCycleOptions = {
  requestUrl: string;
  /** Skip workers (default: full pipeline) */
  workers?: WorkerId[];
  /** Force homepage cache bust after cycle */
  refreshHomepage?: boolean;
};

async function runDevOrchestration(
  requestUrl: string,
  workers: WorkerId[]
): Promise<OrchestrateResult> {
  const started = Date.now();
  const results: WorkerResult[] = [];
  let degraded = false;

  for (const id of workers) {
    const deadline = createExecutionDeadline(DEV_STAGE_BUDGET_MS[id]);
    const result = await runQueueWorker(id, { deadline, requestUrl });
    results.push(result);
    if (!result.ok && !result.skipped) degraded = true;
  }

  const durationMs = Date.now() - started;
  const ok = results.some((r) => r.ok && !r.skipped);

  return {
    ok,
    durationMs,
    timedOutSafely: results.some(
      (r) => r.metadata?.timedOutSafely === true || r.error === "deadline_precheck"
    ),
    workers: results,
    degraded,
  };
}

export type NewsroomCycleDelta = {
  news_signals: number;
  news_events: number;
  generated_articles: number;
  generated_published: number;
  news_articles: number;
};

export type NewsroomCycleResult = {
  ok: boolean;
  durationMs: number;
  degraded: boolean;
  timedOutSafely: boolean;
  before: NewsroomSnapshot;
  after: NewsroomSnapshot;
  delta: NewsroomCycleDelta;
  orchestration: OrchestrateResult;
  pipelineHealth: {
    ingestOk: boolean;
    clusteringEnabled: boolean;
    eventsExist: boolean;
    generationOk: boolean;
    homepageReady: boolean;
    weakestStage: string;
  };
  logs: ReturnType<typeof getNewsroomCycleLogs>;
  blockers: string[];
};

function computeDelta(
  before: NewsroomSnapshot,
  after: NewsroomSnapshot
): NewsroomCycleDelta {
  const diff = (a: number | null, b: number | null) => (b ?? 0) - (a ?? 0);
  return {
    news_signals: diff(before.counts.news_signals, after.counts.news_signals),
    news_events: diff(before.counts.news_events, after.counts.news_events),
    generated_articles: diff(
      before.counts.generated_articles,
      after.counts.generated_articles
    ),
    generated_published: diff(
      before.counts.generated_published,
      after.counts.generated_published
    ),
    news_articles: diff(before.counts.news_articles, after.counts.news_articles),
  };
}

function identifyBlockers(
  after: NewsroomSnapshot,
  orchestration: OrchestrateResult
): string[] {
  const blockers: string[] = [];

  if (!after.env.openAiConfigured) {
    blockers.push("OPENAI_API_KEY missing — editorial generation skipped");
  }
  if (!after.env.clusterEvents) {
    blockers.push("NEWSROOM_CLUSTER_EVENTS=false — signals will not cluster into events");
  }
  if ((after.counts.news_events ?? 0) === 0) {
    blockers.push("No news_events — run ingest with clustering enabled");
  }
  if ((after.counts.generated_published ?? 0) === 0) {
    blockers.push("No published generated_articles — homepage will be empty");
  }

  const ingestWorker = orchestration.workers.find((w) => w.worker === "ingest");
  if (ingestWorker && !ingestWorker.ok && !ingestWorker.skipped) {
    blockers.push(`Ingest failed: ${ingestWorker.error ?? "unknown"}`);
  }

  const editorialWorker = orchestration.workers.find(
    (w) => w.worker === "editorial_generate"
  );
  const editorialPublished =
    (editorialWorker?.metadata?.published as number | undefined) ?? 0;
  if (
    editorialWorker &&
    !editorialWorker.skipped &&
    !editorialWorker.ok &&
    editorialPublished === 0 &&
    (after.counts.generated_published ?? 0) === 0 &&
    after.env.openAiConfigured
  ) {
    blockers.push(
      `Editorial generation failed: ${editorialWorker.error ?? "no articles published"}`
    );
  } else if (
    editorialWorker &&
    editorialPublished === 0 &&
    (after.counts.generated_published ?? 0) > 0
  ) {
    blockers.push(
      "No new editorials this run — existing published generated_articles on homepage"
    );
  }

  return blockers;
}

function assessWeakestStage(
  after: NewsroomSnapshot,
  orchestration: OrchestrateResult,
  delta: NewsroomCycleDelta
): string {
  const ingest = orchestration.workers.find((w) => w.worker === "ingest");
  if (!ingest?.ok || (ingest.metadata?.totalFetched as number) === 0) {
    return "rss_api_ingest";
  }
  if (delta.news_signals <= 0 && (after.counts.news_signals ?? 0) < 5) {
    return "signal_persistence";
  }
  if (!after.env.clusterEvents || delta.news_events <= 0) {
    return "event_clustering";
  }
  const editorial = orchestration.workers.find((w) => w.worker === "editorial_generate");
  if (
    (after.counts.generated_published ?? 0) === 0 ||
    (editorial && !editorial.ok && !editorial.skipped)
  ) {
    return "ai_editorial_generation";
  }
  if (!after.homepage.ready) {
    return "homepage_feed";
  }
  return "none";
}

export async function runFullNewsroomCycle(
  options: NewsroomCycleOptions
): Promise<NewsroomCycleResult> {
  const started = Date.now();
  resetNewsroomCycleLogs();

  const before = await captureNewsroomSnapshot();
  logNewsroomCycle({
    stage: "snapshot_before",
    ok: before.configured,
    counts: {
      signals: before.counts.news_signals,
      events: before.counts.news_events,
      generated: before.counts.generated_published,
    },
  });

  const workerIds = options.workers ?? DEV_PIPELINE;
  const orchestration = await runDevOrchestration(options.requestUrl, workerIds);

  for (const worker of orchestration.workers) {
    const stageMap: Record<WorkerId, import("@/lib/newsroom/debug/logger").NewsroomCycleStage> =
      {
        ingest: "ingest",
        ai_enrich: "ai_enrich",
        editorial_generate: "editorial_generate",
        editorial_images: "editorial_images",
        job_processor: "clustering",
        intelligence_embed: "clustering",
        intelligence_snapshot: "clustering",
        analytics_aggregate: "homepage_refresh",
        dam_analyze: "clustering",
        event_cluster: "clustering",
      };
    logNewsroomCycle({
      stage: stageMap[worker.worker],
      durationMs: worker.durationMs,
      ok: worker.ok,
      error: worker.error,
      metadata: worker.metadata,
    });
  }

  if (options.refreshHomepage !== false) {
    const refreshStarted = Date.now();
    const published =
      (orchestration.workers.find((w) => w.worker === "editorial_generate")?.metadata
        ?.published as number) ?? 0;
    await revalidateNewsroomCaches({ publishedStories: published });
    logNewsroomCycle({
      stage: "homepage_refresh",
      durationMs: Date.now() - refreshStarted,
      ok: true,
      metadata: { published },
    });
  }

  const after = await captureNewsroomSnapshot();
  logNewsroomCycle({
    stage: "snapshot_after",
    ok: after.configured,
    counts: {
      signals: after.counts.news_signals,
      events: after.counts.news_events,
      generated: after.counts.generated_published,
    },
  });

  const delta = computeDelta(before, after);
  const blockers = identifyBlockers(after, orchestration);
  const weakestStage = assessWeakestStage(after, orchestration, delta);

  const ingestWorker = orchestration.workers.find((w) => w.worker === "ingest");
  const editorialWorker = orchestration.workers.find(
    (w) => w.worker === "editorial_generate"
  );
  const editorialPublished =
    (editorialWorker?.metadata?.published as number | undefined) ?? 0;
  const ingestRan = Boolean(ingestWorker);
  const ingestFetched =
    (ingestWorker?.metadata?.totalFetched as number | undefined) ?? 0;

  const pipelineHealth = {
    ingestOk: ingestRan ? Boolean(ingestWorker?.ok) : true,
    ingestFetched,
    signalsInserted:
      (ingestWorker?.metadata?.signalsInserted as number | undefined) ?? delta.news_signals,
    clusteringEnabled: after.env.clusterEvents,
    eventsExist: (after.counts.news_events ?? 0) > 0,
    generationOk:
      editorialPublished > 0 ||
      delta.generated_published > 0 ||
      (after.counts.generated_published ?? 0) > 0,
    homepageReady: after.homepage.ready,
    weakestStage,
  };

  const durationMs = Date.now() - started;
  const ok =
    pipelineHealth.eventsExist &&
    pipelineHealth.homepageReady &&
    (pipelineHealth.generationOk || !after.env.openAiConfigured) &&
    (!ingestRan || ingestFetched > 0 || pipelineHealth.signalsInserted >= 0);

  logNewsroomCycle({
    stage: "cycle_complete",
    durationMs,
    ok,
    metadata: { delta, pipelineHealth, blockers, degraded: orchestration.degraded },
  });

  return {
    ok,
    durationMs,
    degraded: orchestration.degraded,
    timedOutSafely: orchestration.timedOutSafely,
    before,
    after,
    delta,
    orchestration,
    pipelineHealth,
    logs: getNewsroomCycleLogs(),
    blockers,
  };
}
