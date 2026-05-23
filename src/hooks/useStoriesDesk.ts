"use client";

import { useContext } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { EditorialDeskContext } from "@/providers/EditorialDeskContext";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import type { SaasDashboardSnapshot } from "@/lib/dashboard/types";

type DeskData = EditorialDashboardSnapshot | SaasDashboardSnapshot | null;

export function useStoriesDesk() {
  const editorial = useContext(EditorialDeskContext);
  if (editorial) {
    return {
      data: editorial.data as DeskData,
      loading: editorial.loading,
      error: editorial.error,
      runAction: editorial.runAction as (
        action: string,
        payload: Record<string, string | number | boolean | undefined>,
        options?: {
          optimistic?: (prev: EditorialDashboardSnapshot) => EditorialDashboardSnapshot;
        }
      ) => Promise<boolean>,
      busyId: editorial.busyId,
    };
  }

  const admin = useAdminNewsroom();
  return {
    data: admin.data,
    loading: admin.loading,
    error: admin.error,
    runAction: admin.runAction,
    busyId: admin.busyId,
  };
}
