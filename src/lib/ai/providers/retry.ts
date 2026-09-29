import type { ClassifiedAiError } from "@/lib/ai/providers/types";
import {
  maxRetryAttempts,
  shouldRetryAiError,
} from "@/lib/observability/ai-cost/retry-policy";

const BASE_DELAY_MS = 800;
/** Longest we will wait inline for a Retry-After before failing over instead. */
export const MAX_INLINE_RETRY_WAIT_MS = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** ±25% jitter so simultaneous retries across instances do not synchronise. */
export function withJitter(ms: number, random: () => number = Math.random): number {
  return Math.round(ms * (0.75 + random() * 0.5));
}

/**
 * Delay before the next attempt. Honors Retry-After when present (jittered upward only, never
 * shorter than the provider asked); otherwise exponential backoff with jitter.
 * Returns null when the provider asked for a wait longer than we should block on — the caller
 * should fail over rather than wait.
 */
export function computeRetryDelayMs(
  attempt: number,
  retryAfterMs: number | undefined,
  random: () => number = Math.random
): number | null {
  if (retryAfterMs !== undefined) {
    if (retryAfterMs > MAX_INLINE_RETRY_WAIT_MS) return null;
    return Math.round(retryAfterMs * (1 + random() * 0.25));
  }
  return withJitter(BASE_DELAY_MS * 2 ** attempt, random);
}

export async function withTransientAiRetry<T>(input: {
  operation: string;
  provider: string;
  fn: (attempt: number) => Promise<T>;
  isRetryable: (err: ClassifiedAiError) => boolean;
}): Promise<T> {
  let lastError: ClassifiedAiError | null = null;
  const maxAttempts = maxRetryAttempts(input.operation);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await input.fn(attempt);
    } catch (err) {
      const classified =
        err && typeof err === "object" && "retryable" in err
          ? (err as ClassifiedAiError)
          : null;
      if (!classified) throw err;
      lastError = classified;
      if (!shouldRetryAiError(classified, attempt, maxAttempts)) {
        throw classified;
      }
      const delay = computeRetryDelayMs(attempt, classified.retryAfterMs);
      if (delay === null) throw classified; // provider wants a long wait: fail over instead
      console.warn(
        `[ai-retry] ${input.provider}/${input.operation} attempt ${attempt + 1}/${maxAttempts}: ${classified.message} — retry in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("AI retry exhausted");
}
