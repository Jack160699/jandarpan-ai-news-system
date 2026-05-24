/**
 * Shared HTTP client — retry, timeout, no-store, rate-limit detection
 */

import { classifyHttpFailure, NewsFetchError } from "@/lib/news/errors";
import { withLiveFetchInit } from "@/lib/news/fetch-policy";

export type FetchJsonOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
  provider?: string;
};

const DEFAULT_TIMEOUT = 8_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof NewsFetchError) return err.retryable;
  if (err instanceof Error) {
    if (err.name === "AbortError") return true;
    return /network|timeout|fetch failed|ECONNRESET/i.test(err.message);
  }
  return false;
}

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<{ data: T; status: number; durationMs: number }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY;
  const provider = options.provider;
  const startedAt = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(
        url,
        withLiveFetchInit({
          signal: controller.signal,
          headers: options.headers,
        })
      );

      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const classified = classifyHttpFailure(res.status, body, provider);
        console.error(
          `[news/http] ${provider ?? "fetch"} HTTP ${res.status} (attempt ${attempt + 1}/${retries + 1}):`,
          body.slice(0, 160)
        );
        throw classified;
      }

      const data = (await res.json()) as T;
      if (attempt > 0) {
        console.log(
          `[news/http] Recovered after ${attempt} retries for ${provider ?? url}`
        );
      }
      return { data, status: res.status, durationMs };
    } catch (err) {
      clearTimeout(timer);
      lastError =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "Request failed");

      if (err instanceof Error && err.name === "AbortError") {
        lastError = new NewsFetchError(
          provider ? `${provider}: request timed out` : "Request timed out",
          { code: "TIMEOUT", retryable: true, provider, cause: err }
        );
      }

      if (attempt < retries && isRetryableError(lastError)) {
        console.warn(
          `[news/http] Retry ${attempt + 1}/${retries} for ${provider ?? url}: ${lastError.message}`
        );
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw lastError ?? new Error("Request failed");
}
