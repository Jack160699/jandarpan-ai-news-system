/**
 * In-process + Redis-backed performance metrics ring buffers
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import type {
  ApiMetricSample,
  QueueMetricSnapshot,
  WorkerMetricSample,
} from "@/lib/observability/types";

const MAX_SAMPLES = 200;
const METRICS_TTL_SEC = 3600;

const METRIC_KEYS = {
  api: "ops:metrics:api:v1",
  workers: "ops:metrics:workers:v1",
  queues: "ops:metrics:queues:v1",
  db: "ops:metrics:db:v1",
} as const;

type DbMetricSample = {
  operation: string;
  table?: string;
  durationMs: number;
  ok: boolean;
  ts: string;
};

const memoryApi: ApiMetricSample[] = [];
const memoryWorkers: WorkerMetricSample[] = [];
const memoryDb: DbMetricSample[] = [];

function pushRing<T>(buf: T[], item: T): void {
  buf.push(item);
  if (buf.length > MAX_SAMPLES) buf.shift();
}

async function loadRing<T>(key: string, fallback: T[]): Promise<T[]> {
  const remote = await cacheGetJson<T[]>(key);
  return remote ?? [...fallback];
}

async function saveRing<T>(key: string, buf: T[]): Promise<void> {
  const trimmed = buf.slice(-MAX_SAMPLES);
  await cacheSetJson(key, trimmed, METRICS_TTL_SEC);
}

export async function recordApiMetric(sample: ApiMetricSample): Promise<void> {
  pushRing(memoryApi, sample);
  const buf = await loadRing(METRIC_KEYS.api, memoryApi);
  pushRing(buf, sample);
  await saveRing(METRIC_KEYS.api, buf);
}

export async function recordWorkerMetric(
  sample: WorkerMetricSample
): Promise<void> {
  pushRing(memoryWorkers, sample);
  const buf = await loadRing(METRIC_KEYS.workers, memoryWorkers);
  pushRing(buf, sample);
  await saveRing(METRIC_KEYS.workers, buf);
}

export async function recordDbMetric(sample: DbMetricSample): Promise<void> {
  pushRing(memoryDb, sample);
  const buf = await loadRing(METRIC_KEYS.db, memoryDb);
  pushRing(buf, sample);
  await saveRing(METRIC_KEYS.db, buf);
}

export async function recordQueueSnapshot(
  snapshot: QueueMetricSnapshot
): Promise<void> {
  await cacheSetJson(METRIC_KEYS.queues, snapshot, METRICS_TTL_SEC);
}

export async function getMetricsDashboard(): Promise<{
  api: ApiMetricSample[];
  workers: WorkerMetricSample[];
  db: DbMetricSample[];
  queues: QueueMetricSnapshot | null;
  memoryUsageMb: number;
  uptimeSec: number;
}> {
  const [api, workers, db, queues] = await Promise.all([
    loadRing(METRIC_KEYS.api, memoryApi),
    loadRing(METRIC_KEYS.workers, memoryWorkers),
    loadRing(METRIC_KEYS.db, memoryDb),
    cacheGetJson<QueueMetricSnapshot>(METRIC_KEYS.queues),
  ]);

  const mem = process.memoryUsage();

  return {
    api: api.slice(-50),
    workers: workers.slice(-30),
    db: db.slice(-30),
    queues,
    memoryUsageMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
    uptimeSec: Math.round(process.uptime()),
  };
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx] ?? 0;
}

export function summarizeApiLatency(samples: ApiMetricSample[]): {
  count: number;
  p50: number;
  p95: number;
  errorRate: number;
} {
  const durations = samples.map((s) => s.durationMs);
  const errors = samples.filter((s) => s.status >= 500).length;
  return {
    count: samples.length,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    errorRate: samples.length ? errors / samples.length : 0,
  };
}
