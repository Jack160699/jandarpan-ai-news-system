import type { ExecutionDeadline } from "@/lib/serverless/deadline";

export type WorkerId =
  | "ingest"
  | "ai_enrich"
  | "editorial_generate"
  | "editorial_images"
  | "job_processor"
  | "intelligence_embed"
  | "intelligence_snapshot"
  | "analytics_aggregate"
  | "dam_analyze"
  | "event_cluster";

export type WorkerResult = {
  worker: WorkerId;
  ok: boolean;
  durationMs: number;
  skipped?: boolean;
  error?: string;
  metadata?: import("@/types/json").JsonObject;
};

export type WorkerTuningHints = {
  aiPending?: number;
  editorialPending?: number;
  /** Ms reclaimed from faster upstream workers */
  bonusBudgetMs?: number;
};

export type WorkerContext = {
  deadline: ExecutionDeadline;
  requestUrl: string;
  tuning?: WorkerTuningHints;
};

export type QueueWorker = {
  id: WorkerId;
  label: string;
  run: (ctx: WorkerContext) => Promise<WorkerResult>;
};
