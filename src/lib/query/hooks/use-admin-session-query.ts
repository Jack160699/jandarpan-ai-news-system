"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type { AdminSessionResponse } from "@/lib/auth/admin-session-types";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { queryKeys } from "@/lib/query/query-keys";

const SESSION_STALE_MS = 30_000;

async function fetchAdminSession(): Promise<AdminSessionResponse> {
  tracePerf("AUTH", "session_query_fetch");
  const result = await apiClient.get<AdminSessionResponse>(
    "/api/dashboard/auth/session",
    { label: "admin_session", skipDedupe: false }
  );
  if (!result.ok) {
    return {
      ok: false,
      error: result.timedOut ? "timeout" : result.error,
      message: result.error,
    };
  }
  return result.data;
}

export function useAdminSessionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.session,
    queryFn: fetchAdminSession,
    enabled,
    staleTime: SESSION_STALE_MS,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
