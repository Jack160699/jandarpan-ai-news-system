/**
 * Unified worker job types — Jan Darpan OS async processing
 */

import type { Json } from "@/types/supabase";
import type { JsonObject } from "@/types/json";

export type JobStatus =
  | "pending"
  | "claimed"
  | "completed"
  | "failed"
  | "dead";

export type JobType =
  | "embed_signals"
  | "embed_articles"
  | "editorial_generate"
  | "intelligence_snapshot"
  | "intelligence_cluster"
  | "intelligence_summary"
  | "seo_analysis"
  | "translation_batch"
  | "dam_analyze"
  | "analytics_aggregate"
  | "event_cluster";

export type WorkerJobRow = {
  id: string;
  tenant_id: string | null;
  job_type: JobType;
  dedupe_key: string;
  payload: JsonObject;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  result: Json | null;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
};

export type EnqueueJobInput = {
  jobType: JobType;
  dedupeKey: string;
  tenantId?: string | null;
  payload?: JsonObject;
  priority?: number;
  maxAttempts?: number;
  scheduledAt?: Date;
  timeoutMs?: number;
};

export type JobHandlerResult = {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
  /** Re-queue without counting as hard failure */
  retryable?: boolean;
};

export type JobHandler = (
  job: WorkerJobRow
) => Promise<JobHandlerResult>;

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  embed_signals: "Embed news signals",
  embed_articles: "Embed generated articles",
  editorial_generate: "AI editorial generation",
  intelligence_snapshot: "Build intelligence snapshot",
  intelligence_cluster: "Semantic signal clustering",
  intelligence_summary: "Batch article summaries",
  seo_analysis: "SEO opportunity analysis",
  translation_batch: "Translation suggestions",
  dam_analyze: "DAM vision AI analysis",
  analytics_aggregate: "Analytics rollup snapshot",
  event_cluster: "Signal→event clustering",
};
