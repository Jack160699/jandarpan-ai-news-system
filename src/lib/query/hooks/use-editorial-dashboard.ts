"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { queryKeys } from "@/lib/query/query-keys";

const POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_POLL_MS) || 60_000;

type DashboardApiResponse = EditorialDashboardSnapshot & { ok?: boolean; error?: string };

async function fetchDashboard(): Promise<EditorialDashboardSnapshot> {
  tracePerf("QUERY", "editorial_dashboard_fetch");
  const result = await apiClient.get<DashboardApiResponse>(
    "/api/editorial/dashboard",
    { label: "editorial_dashboard" }
  );
  if (!result.ok) {
    throw new Error(result.timedOut ? "timeout" : result.error);
  }
  if (result.data.ok === false) {
    throw new Error(result.data.error ?? "dashboard_failed");
  }
  return result.data;
}

export function useEditorialDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.editorial.dashboard,
    queryFn: fetchDashboard,
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? POLL_MS : false,
  });
}
