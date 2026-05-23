/**
 * Provider retry with exponential backoff + timeout
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { fetchWithTimeout } from "@/lib/serverless/fetch-timeout";

export async function withProviderRetry<T>(
  provider: string,
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; timeoutMs?: number }
): Promise<T> {
  const maxAttempts =
    options?.maxAttempts ?? INFRA_CONFIG.providerMaxRetries + 1;
  const timeoutMs =
    options?.timeoutMs ?? INFRA_CONFIG.providerFetchTimeoutMs;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchWithTimeout(fn, timeoutMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const delay =
          INFRA_CONFIG.providerRetryBaseMs * Math.pow(2, attempt - 1);
        logIngestionAnalytics({
          event: "provider_retry",
          provider,
          metadata: { attempt, delayMs: delay, error: lastError.message },
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error(`${provider} failed after retries`);
}
