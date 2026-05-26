/**
 * Legacy transport shim — prefer AdminSessionProvider + useAdminSession().
 * Kept for gradual migration; delegates to api-client with in-flight dedupe.
 */

import { apiClient } from "@/lib/api/api-client";
import type { AdminSessionResponse } from "@/lib/auth/admin-session-types";
import { traceStability } from "@/lib/observability/stability-trace";

export type { AdminSessionResponse as AdminSessionPayload };

const CACHE_TTL_MS = 30_000;

let cache: { value: AdminSessionResponse | null; at: number } = {
  value: null,
  at: 0,
};

let inFlight: Promise<AdminSessionResponse> | null = null;
type Subscriber = (next: AdminSessionResponse | null) => void;
const subs = new Set<Subscriber>();

function publish(next: AdminSessionResponse | null) {
  for (const cb of subs) cb(next);
}

function fresh(): AdminSessionResponse | null {
  if (!cache.value) return null;
  if (Date.now() - cache.at > CACHE_TTL_MS) return null;
  return cache.value;
}

export const adminAuthController = {
  subscribe(cb: Subscriber) {
    subs.add(cb);
    return () => subs.delete(cb);
  },

  invalidate() {
    cache = { value: null, at: 0 };
    traceStability("SESSION_REFRESH", "admin_session_cache_invalidated");
    publish(cache.value);
  },

  async getSession(options?: { signal?: AbortSignal; force?: boolean }) {
    const cached = !options?.force ? fresh() : null;
    if (cached) return cached;

    if (inFlight) {
      traceStability("AUTH_LOOP", "admin_session_dedupe_in_flight");
      return inFlight;
    }

    inFlight = (async () => {
      try {
        const result = await apiClient.get<AdminSessionResponse>(
          "/api/dashboard/auth/session",
          { label: "admin_session", signal: options?.signal }
        );
        const json: AdminSessionResponse = result.ok
          ? result.data
          : { ok: false, error: result.timedOut ? "timeout" : result.error };
        cache = { value: json, at: Date.now() };
        publish(cache.value);
        return json;
      } catch (e) {
        const isAbort =
          e instanceof DOMException && (e.name === "AbortError" || e.name === "TimeoutError");
        const fallback: AdminSessionResponse = {
          ok: false,
          error: isAbort ? "timeout" : "error",
        };
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
