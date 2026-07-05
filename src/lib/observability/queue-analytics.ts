/**
 * Queue analytics — drain rates, ETA, failure breakdown, performance audit
 */

import { getMetricsDashboard } from "@/lib/observability/metrics";
import {
  computeDrainPerHour,
  computeQueueEta,
  type QueueEta,
} from "@/lib/infrastructure/queue/tuning";
import {
  getQueueFailureRecords,
  summarizeFailures,
} from "@/lib/infrastructure/queue/failure-record";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { countDeadAiQueue } from "@/lib/news/ai/ai-queue-retry";
import {
  countPendingEditorialImages,
  countProcessingEditorialImages,
} from "@/lib/news/ai/editorial-image-queue";
import { getImageMetricsSnapshot } from "@/lib/news/ai/editorial-image-metrics";
import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";

export type QueueAnalyticsDashboard = {
  ai: {
    pending: number;
    dead: number;
    drainPerHour: number;
    eta: QueueEta;
  };
  editorial: {
    pending: number;
    processing: number;
    drainPerHour: number;
    eta: QueueEta;
    avgGenerationMs: number | null;
    openAiSuccessRate: number;
    storageSuccessRate: number;
    retries: number;
    deadJobs: number;
    failureReasons: Record<string, number>;
  };
  performance: {
    aiRecordsPerSec: number;
    editorialRecordsPerSec: number;
    bottleneck: string;
  };
  recentFailures: {
    ai: Awaited<ReturnType<typeof getQueueFailureRecords>>;
    editorial: Awaited<ReturnType<typeof getQueueFailureRecords>>;
  };
};

const PERF_KEY = "ops:perf-audit:v1";
const PERF_TTL = 3600;

export type PerfAuditSample = {
  worker: string;
  ts: string;
  recordsPerSec: number;
  openAiWaitMs?: number;
  uploadWaitMs?: number;
  dbWaitMs?: number;
  networkWaitMs?: number;
};

export async function recordPerfAudit(sample: PerfAuditSample): Promise<void> {
  const existing = (await cacheGetJson<PerfAuditSample[]>(PERF_KEY)) ?? [];
  existing.push(sample);
  await cacheSetJson(PERF_KEY, existing.slice(-50), PERF_TTL);
}

function inferBottleneck(
  imageMetrics: Awaited<ReturnType<typeof getImageMetricsSnapshot>>,
  aiRps: number,
  editorialRps: number
): string {
  if (imageMetrics.providerErrors > imageMetrics.completed * 0.1) return "openai";
  if (imageMetrics.queueDepth > 500 && editorialRps < 5) return "editorial_throughput";
  if (aiRps < 10) return "ai_throughput";
  if (imageMetrics.avgLatencyMs && imageMetrics.avgLatencyMs > 20_000) return "image_latency";
  return "balanced";
}

export async function getQueueAnalyticsDashboard(): Promise<QueueAnalyticsDashboard> {
  const [metrics, aiPending, aiDead, editorialPending, editorialProcessing, imageMetrics, aiFailures, editorialFailures, perfSamples] =
    await Promise.all([
      getMetricsDashboard(),
      countPendingAiQueue(),
      countDeadAiQueue().catch(() => 0),
      countPendingEditorialImages(),
      countProcessingEditorialImages(),
      getImageMetricsSnapshot(),
      getQueueFailureRecords("ai_enrich", 15),
      getQueueFailureRecords("editorial_images", 15),
      cacheGetJson<PerfAuditSample[]>(PERF_KEY),
    ]);

  const aiDrain = computeDrainPerHour(metrics.queueDrain, "ai_enrich");
  const editorialDrain = computeDrainPerHour(metrics.queueDrain, "editorial_images");

  const aiWorkerSummary = metrics.workerDurationSummary.ai_enrich;
  const editorialWorkerSummary = metrics.workerDurationSummary.editorial_images;

  const aiRps =
    aiWorkerSummary && aiWorkerSummary.avgMs > 0
      ? Math.round((1000 / aiWorkerSummary.avgMs) * 10) / 10
      : perfSamples?.find((p) => p.worker === "ai_enrich")?.recordsPerSec ?? 0;

  const editorialRps =
    editorialWorkerSummary && editorialWorkerSummary.avgMs > 0
      ? Math.round((1000 / editorialWorkerSummary.avgMs) * 10) / 10
      : perfSamples?.find((p) => p.worker === "editorial_images")?.recordsPerSec ?? 0;

  const editorialFailureSummary = summarizeFailures(editorialFailures);
  const openAiAttempts = imageMetrics.aiGenerated + imageMetrics.providerErrors;
  const openAiSuccessRate =
    openAiAttempts > 0
      ? Math.round((imageMetrics.aiGenerated / openAiAttempts) * 1000) / 10
      : 100;

  const storageFails = editorialFailureSummary.byCategory.storage ?? 0;
  const storageAttempts = imageMetrics.completed + storageFails;
  const storageSuccessRate =
    storageAttempts > 0
      ? Math.round(((storageAttempts - storageFails) / storageAttempts) * 1000) / 10
      : 100;

  return {
    ai: {
      pending: aiPending,
      dead: aiDead,
      drainPerHour: aiDrain,
      eta: computeQueueEta(aiPending, aiDrain),
    },
    editorial: {
      pending: editorialPending,
      processing: editorialProcessing,
      drainPerHour: editorialDrain,
      eta: computeQueueEta(editorialPending, editorialDrain),
      avgGenerationMs: imageMetrics.avgLatencyMs,
      openAiSuccessRate,
      storageSuccessRate,
      retries: imageMetrics.retried,
      deadJobs: editorialFailureSummary.terminal,
      failureReasons: editorialFailureSummary.byCategory,
    },
    performance: {
      aiRecordsPerSec: aiRps,
      editorialRecordsPerSec: editorialRps,
      bottleneck: inferBottleneck(imageMetrics, aiRps, editorialRps),
    },
    recentFailures: {
      ai: aiFailures,
      editorial: editorialFailures,
    },
  };
}
