/**
 * Admin V3 fetching standard — thin wrapper over apiClient + poll policy.
 * Prefer this for new admin client fetches; do not introduce a second library.
 */

import { apiClient, type ApiClientOptions, type ApiResult } from "@/lib/api/api-client";
import { ADMIN_POLL, isDocumentHidden } from "@/lib/admin-v3/admin-poll";

export type AdminFetchOptions = ApiClientOptions & {
  /** Default 8s via apiClient; overview/health summary should stay ≤4s */
  timeoutMs?: number;
};

export const ADMIN_FETCH_DEFAULTS = {
  timeoutMs: 8_000,
  summaryTimeoutMs: 4_000,
  diagnosticsTimeoutMs: 12_000,
  staleMs: ADMIN_POLL.clientStaleMs,
} as const;

export async function adminGet<T>(
  url: string,
  options: AdminFetchOptions = {}
): Promise<ApiResult<T>> {
  return apiClient.get<T>(url, {
    timeoutMs: options.timeoutMs ?? ADMIN_FETCH_DEFAULTS.timeoutMs,
    credentials: "include",
    ...options,
  });
}

export async function adminPost<T>(
  url: string,
  body?: unknown,
  options: AdminFetchOptions = {}
): Promise<ApiResult<T>> {
  return apiClient.post<T>(url, body, {
    timeoutMs: options.timeoutMs ?? ADMIN_FETCH_DEFAULTS.timeoutMs,
    credentials: "include",
    ...options,
  });
}

/** Skip background work when the tab is hidden. */
export function shouldSkipBackgroundFetch(): boolean {
  return isDocumentHidden();
}

export type PartialSectionState =
  | "loading"
  | "loaded"
  | "partial"
  | "stale"
  | "timeout"
  | "unavailable"
  | "forbidden"
  | "empty";
