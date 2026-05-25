import type { AiJobPayload, AiJobResult, AiJobStatus } from "./types";

/** In-memory queue stub — replace with Supabase `ai_logs` + worker */
const queue = new Map<string, AiJobResult>();

export function enqueueAiJob(payload: AiJobPayload): AiJobResult {
  const jobId = `ai-${payload.type}-${payload.articleId}-${Date.now()}`;
  const job: AiJobResult = {
    jobId,
    status: "queued",
  };
  queue.set(jobId, job);
  return job;
}

export function updateAiJobStatus(
  jobId: string,
  status: AiJobStatus,
  output?: Record<string, unknown>,
  error?: string
): AiJobResult | null {
  const existing = queue.get(jobId);
  if (!existing) return null;
  const next: AiJobResult = {
    ...existing,
    status,
    output,
    error,
    completedAt: status === "completed" || status === "failed" ? new Date().toISOString() : undefined,
  };
  queue.set(jobId, next);
  return next;
}

export function getAiJob(jobId: string): AiJobResult | null {
  return queue.get(jobId) ?? null;
}
