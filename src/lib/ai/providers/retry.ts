import type { ClassifiedAiError } from "@/lib/ai/providers/types";
import {
  maxRetryAttempts,
  shouldRetryAiError,
} from "@/lib/observability/openai-cost/retry-policy";

const BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
      const delay = BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[ai-retry] ${input.provider}/${input.operation} attempt ${attempt + 1}/${maxAttempts}: ${classified.message} — retry in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("AI retry exhausted");
}
