export type LogContext = Record<string, unknown>;

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export type HealthCheckResult = {
  id: string;
  label: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
};

export type OpsErrorSeverity = "low" | "medium" | "high" | "critical";

export type OpsErrorEvent = {
  id: string;
  ts: string;
  severity: OpsErrorSeverity;
  source: string;
  message: string;
  requestId?: string;
  route?: string;
  worker?: string;
  metadata?: import("@/types/json").JsonObject;
  resolved?: boolean;
};

export type ApiMetricSample = {
  route: string;
  method: string;
  status: number;
  durationMs: number;
  ts: string;
};

export type WorkerMetricSample = {
  worker: string;
  ok: boolean;
  durationMs: number;
  skipped?: boolean;
  ts: string;
  startedAt?: string;
  finishedAt?: string;
  recordsProcessed?: number;
  recordsSkipped?: number;
  remainingQueue?: number;
  deadlineRemaining?: number;
  reasonIfSkipped?: string;
  status?: string;
  recordsPerSec?: number;
  batchDurationMs?: number;
};

export type QueueDrainMetric = {
  worker: string;
  recordsProcessed: number;
  recordsSkipped: number;
  remainingQueue: number;
  durationMs: number;
  recordsPerSec: number;
  batchCount: number;
  partial: boolean;
  ts: string;
};

export type QueueMetricSnapshot = {
  aiPending: number;
  editorialImagesPending: number;
  ts: string;
  aiDrainPerHour?: number;
  editorialDrainPerHour?: number;
  aiEtaLabel?: string;
  editorialEtaLabel?: string;
};

export type StabilityScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: Array<{ name: string; weight: number; score: number; note?: string }>;
};
