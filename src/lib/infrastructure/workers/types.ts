import type { ExecutionDeadline } from "@/lib/serverless/deadline";

export type WorkerId =
  | "ingest"
  | "ai_enrich"
  | "editorial_generate"
  | "editorial_images";

export type WorkerResult = {
  worker: WorkerId;
  ok: boolean;
  durationMs: number;
  skipped?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type WorkerContext = {
  deadline: ExecutionDeadline;
  requestUrl: string;
};

export type QueueWorker = {
  id: WorkerId;
  label: string;
  run: (ctx: WorkerContext) => Promise<WorkerResult>;
};
