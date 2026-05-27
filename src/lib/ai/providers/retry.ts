import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const MAX_ATTEMPTS = 3;
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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await input.fn(attempt);
    } catch (err) {
      const classified =
        err && typeof err === "object" && "retryable" in err
          ? (err as ClassifiedAiError)
          : null;
      if (!classified) throw err;
      lastError = classified;
      if (!input.isRetryable(classified) || attempt >= MAX_ATTEMPTS - 1) {
        throw classified;
      }
      const delay = BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[ai-retry] ${input.provider}/${input.operation} attempt ${attempt + 1}/${MAX_ATTEMPTS}: ${classified.message} — retry in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("AI retry exhausted");
}
