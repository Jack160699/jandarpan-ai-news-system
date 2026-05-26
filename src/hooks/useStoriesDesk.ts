"use client";

import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";

export function useStoriesDesk() {
  const admin = useAdminNewsroom();
  return {
    data: admin.data,
    loading: admin.loading,
    error: admin.error,
    runAction: admin.runAction as (
      action: string,
      payload: Record<string, string | number | boolean | undefined>,
      options?: {
        optimistic?: (
          prev: EditorialDashboardSnapshot
        ) => EditorialDashboardSnapshot;
      }
    ) => Promise<boolean>,
    busyId: admin.busyId,
  };
}
