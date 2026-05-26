/**
 * Central typed HTTP client for admin/runtime fetches.
 * - timeouts, dedupe (GET), credentials, tracing
 */

import { traceDegraded, tracePerf, tracePerfTiming } from "@/lib/observability/performance-monitor";
import { isTimeoutError, withTimeout } from "@/lib/utils/withTimeout";

export type ApiClientOptions = {
  timeoutMs?: number;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip in-flight GET dedupe */
  skipDedupe?: boolean;
  label?: string;
};

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; timedOut?: boolean };

const DEFAULT_TIMEOUT_MS = 8_000;

const inflightGet = new Map<string, Promise<unknown>>();

function requestKey(method: string, url: string, body?: string): string {
  return `${method}:${url}:${body ?? ""}`;
}

function mergeSignals(
  a?: AbortSignal,
  timeoutMs?: number
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer =
    timeoutMs && timeoutMs > 0
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

  if (a) {
    if (a.aborted) controller.abort();
    else a.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timer) window.clearTimeout(timer);
    },
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options: ApiClientOptions = {}
): Promise<ApiResult<T>> {
  const label = options.label ?? url;
  const started = Date.now();
  tracePerf("API", `${method} ${label}`, { url });

  const { signal, cleanup } = mergeSignals(
    options.signal,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const init: RequestInit = {
      method,
      credentials: options.credentials ?? "include",
      cache: options.cache ?? "no-store",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal,
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await fetch(url, init);
    const data = await parseJson<T>(res);
    tracePerfTiming("API", `${method} ${label}`, started, { status: res.status });

    if (!res.ok) {
      const err =
        typeof data === "object" && data && "error" in data
          ? String((data as { error?: string }).error)
          : `http_${res.status}`;
      if (res.status === 503) traceDegraded("api", "service_unavailable", { url });
      return { ok: false, error: err, status: res.status };
    }

    return { ok: true, data, status: res.status };
  } catch (err) {
    if (isTimeoutError(err) || (err instanceof DOMException && err.name === "AbortError")) {
      traceDegraded("api", "timeout", { url, label });
      return { ok: false, error: "timeout", status: 408, timedOut: true };
    }
    const message = err instanceof Error ? err.message : "network_error";
    tracePerf("API", `${method} ${label} failed`, { message });
    return { ok: false, error: message, status: 0 };
  } finally {
    cleanup();
  }
}

export const apiClient = {
  async get<T>(url: string, options?: ApiClientOptions): Promise<ApiResult<T>> {
    const key = requestKey("GET", url);
    if (!options?.skipDedupe && inflightGet.has(key)) {
      tracePerf("CACHE", "api_get_dedupe", { url });
      return inflightGet.get(key) as Promise<ApiResult<T>>;
    }

    const promise = request<T>("GET", url, undefined, options);
    if (!options?.skipDedupe) {
      inflightGet.set(key, promise);
      void promise.finally(() => inflightGet.delete(key));
    }
    return promise;
  },

  post<T>(url: string, body?: unknown, options?: ApiClientOptions) {
    return request<T>("POST", url, body, options);
  },

  patch<T>(url: string, body?: unknown, options?: ApiClientOptions) {
    return request<T>("PATCH", url, body, options);
  },

  put<T>(url: string, body?: unknown, options?: ApiClientOptions) {
    return request<T>("PUT", url, body, options);
  },

  delete<T>(url: string, options?: ApiClientOptions) {
    return request<T>("DELETE", url, undefined, options);
  },

  /** Server-safe variant with withTimeout wrapper (no window) */
  async getServer<T>(
    url: string,
    options: ApiClientOptions & { timeoutMs: number }
  ): Promise<ApiResult<T>> {
    const label = options.label ?? url;
    try {
      const res = await withTimeout(fetch(url, {
        credentials: options.credentials ?? "include",
        cache: options.cache ?? "no-store",
        headers: options.headers,
        signal: options.signal,
      }), { label, timeoutMs: options.timeoutMs });
      const data = await parseJson<T>(res);
      if (!res.ok) {
        return { ok: false, error: `http_${res.status}`, status: res.status };
      }
      return { ok: true, data, status: res.status };
    } catch (err) {
      if (isTimeoutError(err)) {
        return { ok: false, error: "timeout", status: 408, timedOut: true };
      }
      return { ok: false, error: "network_error", status: 0 };
    }
  },
};
