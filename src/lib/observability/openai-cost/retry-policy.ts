/**
 * Retry policy — fewer retries for non-critical AI workers
 */

import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const CRITICAL_OPERATIONS = new Set([
  "editorial_generate",
  "translation",
  "editorial_regenerate",
]);

export function maxRetryAttempts(operation: string): number {
  const env = process.env.OPENAI_MAX_RETRY_ATTEMPTS?.trim();
  if (env) {
    const n = Number(env);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return CRITICAL_OPERATIONS.has(operation) ? 3 : 2;
}

export function isNeverRetryError(err: ClassifiedAiError): boolean {
  if (!err.retryable) return true;
  if (err.invalidRequest) return true;
  if (err.httpStatus === 400) return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("context length") ||
    msg.includes("maximum context") ||
    msg.includes("validation") ||
    msg.includes("invalid")
  );
}

export function shouldRetryAiError(
  err: ClassifiedAiError,
  attempt: number,
  maxAttempts: number
): boolean {
  if (isNeverRetryError(err)) return false;
  return err.retryable && attempt < maxAttempts - 1;
}
