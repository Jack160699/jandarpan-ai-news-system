/**
 * Shared HTTP client — retry, timeout, logging
 */

export type FetchJsonOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
};

const DEFAULT_TIMEOUT = 8_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<{ data: T; status: number; durationMs: number }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY;
  const startedAt = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
        cache: "no-store",
      });

      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as T;
      return { data, status: res.status, durationMs };
    } catch (err) {
      clearTimeout(timer);
      lastError =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "Request failed");

      if (attempt < retries) {
        console.warn(
          `[news/http] Retry ${attempt + 1}/${retries} for ${url}: ${lastError.message}`
        );
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("Request failed");
}
