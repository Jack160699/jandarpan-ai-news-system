"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import { traceDashboard } from "@/lib/observability/dashboard-trace";
import { fetchEditorialDashboard } from "@/lib/query/dashboard-fetch";
import {
  DASHBOARD_GC_MS,
  DASHBOARD_STALE_MS,
  getDashboardPollIntervalMs,
  isAdminUserIdle,
  isEditorialDashboardRoute,
  isDocumentHidden,
} from "@/lib/query/dashboard-poll-state";
import { queryKeys } from "@/lib/query/query-keys";

type DashboardQueryMeta = {
  force?: boolean;
  reason?: "initial" | "poll" | "manual";
};

export function useEditorialDashboardQuery(enabled = true) {
  const pathname = usePathname() ?? "/admin";
  const routeEnabled = isEditorialDashboardRoute(pathname);
  const active = enabled && routeEnabled;

  return useQuery<EditorialDashboardSnapshot>({
    queryKey: queryKeys.editorial.dashboard,
    queryFn: ({ meta, client, queryKey }) => {
      const m = (meta ?? {}) as DashboardQueryMeta;
      const state = client.getQueryState(queryKey);
      const reason =
        m.reason ??
        (state?.dataUpdatedAt && state.dataUpdatedAt > 0 ? "poll" : "initial");
      return fetchEditorialDashboard({
        force: m.force,
        reason,
      });
    },
    enabled: active,
    staleTime: DASHBOARD_STALE_MS,
    gcTime: DASHBOARD_GC_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: false,
    structuralSharing: true,
    placeholderData: (prev: EditorialDashboardSnapshot | undefined) => prev,
    refetchInterval: () => {
      if (!active) return false;
      if (isDocumentHidden()) {
        traceDashboard("DASHBOARD_SKIP_HIDDEN", "refetch_interval");
        return false;
      }
      if (isAdminUserIdle()) return false;
      if (!isEditorialDashboardRoute(pathname)) return false;
      return getDashboardPollIntervalMs();
    },
    meta: { reason: "initial" as const },
  });
}
