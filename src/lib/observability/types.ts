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
  metadata?: Record<string, unknown>;
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
};

export type QueueMetricSnapshot = {
  aiPending: number;
  editorialImagesPending: number;
  ts: string;
};

export type StabilityScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: Array<{ name: string; weight: number; score: number; note?: string }>;
};
