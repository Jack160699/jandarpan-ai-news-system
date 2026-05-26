/**
 * Client-side auth/session controller for admin routes.
 *
 * Goals:
 * - ONE in-flight session request at a time (dedupe)
 * - short-lived caching to avoid re-fetch storms on rerenders/remounts
 * - predictable retry policy under Supabase slowness
 * - NEVER triggers router.refresh() or full reload
 */

import { traceStability } from "@/lib/observability/stability-trace";

export type AdminSessionPayload = {
  ok: boolean;
  user?: { id: string; email: string };
  membership?: {
    role: string;
    tenantName: string;
    tenantSlug: string;
    tenantId: string;
  };
  error?: string;
};

type Subscriber = (next: AdminSessionPayload | null) => void;

const CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 8_000;

let cache: { value: AdminSessionPayload | null; at: number } = {
  value: null,
  at: 0,
};

let inFlight: Promise<AdminSessionPayload> | null = null;
const subs = new Set<Subscriber>();

function publish(next: AdminSessionPayload | null) {
  for (const cb of subs) cb(next);
}

function fresh(): AdminSessionPayload | null {
  if (!cache.value) return null;
  if (Date.now() - cache.at > CACHE_TTL_MS) return null;
  return cache.value;
}

async function fetchWithTimeout(signal?: AbortSignal): Promise<AdminSessionPayload> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    traceStability("SESSION_REFRESH", "admin_session_fetch_start");
    const res = await fetch("/api/dashboard/auth/session", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
    const json = (await res.json()) as AdminSessionPayload;
    traceStability("SESSION_REFRESH", "admin_session_fetch_done", {
      ok: Boolean(json?.ok),
      status: res.status,
    });
    return json;
  } finally {
    window.clearTimeout(t);
  }
}

export const adminAuthController = {
  subscribe(cb: Subscriber) {
    subs.add(cb);
    return () => subs.delete(cb);
  },

  /** Force next call to re-fetch. */
  invalidate() {
    cache = { value: null, at: 0 };
    traceStability("SESSION_REFRESH", "admin_session_cache_invalidated");
    publish(cache.value);
  },

  /** Cached + deduped. Does not throw: returns `{ ok: false }` shape on errors. */
  async getSession(options?: { signal?: AbortSignal; force?: boolean }) {
    const cached = !options?.force ? fresh() : null;
    if (cached) return cached;

    if (inFlight) {
      traceStability("AUTH_LOOP", "admin_session_dedupe_in_flight");
      return inFlight;
    }

    inFlight = (async () => {
      try {
        const json = await fetchWithTimeout(options?.signal);
        cache = { value: json, at: Date.now() };
        publish(cache.value);
        return json;
      } catch (e) {
        const isAbort =
          e instanceof DOMException && (e.name === "AbortError" || e.name === "TimeoutError");
        traceStability("SESSION_REFRESH", "admin_session_fetch_error", {
          abort: isAbort,
          message: e instanceof Error ? e.message : "unknown",
        });
        const fallback: AdminSessionPayload = { ok: false, error: isAbort ? "timeout" : "error" };
        cache = { value: fallback, at: Date.now() };
        publish(cache.value);
        return fallback;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  },
};

