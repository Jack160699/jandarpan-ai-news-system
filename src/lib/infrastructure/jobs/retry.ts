/**
 * Exponential backoff retry strategy for worker jobs
 */

export const RETRY_CONFIG = {
  baseDelayMs: Number(process.env.WORKER_RETRY_BASE_MS) || 2_000,
  maxDelayMs: Number(process.env.WORKER_RETRY_MAX_MS) || 300_000,
  jitterRatio: Number(process.env.WORKER_RETRY_JITTER) || 0.15,
} as const;

export function computeRetryDelayMs(attempt: number): number {
  const exp = Math.min(
    RETRY_CONFIG.maxDelayMs,
    RETRY_CONFIG.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1))
  );
  const jitter = exp * RETRY_CONFIG.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(500, Math.round(exp + jitter));
}

export function nextRetryAt(attempt: number): Date {
  return new Date(Date.now() + computeRetryDelayMs(attempt));
}

export function shouldMoveToDeadLetter(
  attempts: number,
  maxAttempts: number
): boolean {
  return attempts >= maxAttempts;
}
