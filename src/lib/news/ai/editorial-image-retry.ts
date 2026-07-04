/**
 * Configurable retry strategy with exponential backoff for editorial images
 */

export type RetryConfig = {
  maxRepairAttempts: number;
  maxQueueAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
};

export function getRetryConfig(): RetryConfig {
  return {
    maxRepairAttempts: Number(process.env.EDITORIAL_IMAGE_MAX_REPAIR ?? 3),
    maxQueueAttempts: Number(process.env.EDITORIAL_IMAGE_MAX_ATTEMPTS ?? 3),
    baseBackoffMs: Number(process.env.EDITORIAL_IMAGE_BACKOFF_MS ?? 30_000),
    maxBackoffMs: Number(process.env.EDITORIAL_IMAGE_MAX_BACKOFF_MS ?? 300_000),
  };
}

export function computeRetryBackoff(attempt: number, config?: RetryConfig): number {
  const cfg = config ?? getRetryConfig();
  const backoff = cfg.baseBackoffMs * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(backoff, cfg.maxBackoffMs);
}

export function computeScheduledAt(attempt: number, config?: RetryConfig): string {
  const delayMs = computeRetryBackoff(attempt, config);
  return new Date(Date.now() + delayMs).toISOString();
}

export type RetryLogEntry = {
  attempt: number;
  reason: string;
  qualityFlags?: string[];
  promptHash?: string;
  scheduledAt?: string;
  ts: string;
};

export function appendRetryLog(
  existing: RetryLogEntry[] | null | undefined,
  entry: Omit<RetryLogEntry, "ts">
): RetryLogEntry[] {
  return [...(existing ?? []), { ...entry, ts: new Date().toISOString() }];
}
