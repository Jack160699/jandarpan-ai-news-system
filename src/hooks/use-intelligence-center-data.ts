"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { buildIntelligenceCenter } from "@/lib/admin/intelligence-center";
import type { WorkflowBoardSnapshot } from "@/lib/editorial-workflow/types";
import type { LaunchHealthWidget } from "@/lib/ops/launch-health";

type IntelligenceSupplements = {
  workflowAnalytics: WorkflowBoardSnapshot["analytics"] | null;
  launchWidgets: LaunchHealthWidget[];
};

let supplementsCache: IntelligenceSupplements | null = null;
let supplementsPromise: Promise<IntelligenceSupplements> | null = null;

async function loadIntelligenceSupplements(): Promise<IntelligenceSupplements> {
  if (supplementsCache) return supplementsCache;
  if (supplementsPromise) return supplementsPromise;

  supplementsPromise = (async () => {
    try {
      const res = await fetch("/api/admin/newsroom/health", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null;
        launchWidgets?: LaunchHealthWidget[];
      };
      const result: IntelligenceSupplements = {
        workflowAnalytics: json.workflowAnalytics ?? null,
        launchWidgets: json.launchWidgets ?? [],
      };
      supplementsCache = result;
      return result;
    } catch {
      const fallback: IntelligenceSupplements = {
        workflowAnalytics: null,
        launchWidgets: [],
      };
      supplementsCache = fallback;
      return fallback;
    } finally {
      supplementsPromise = null;
    }
  })();

  return supplementsPromise;
}

export function useIntelligenceCenterData() {
  const { data, loading, error } = useAdminNewsroom();
  const [supplements, setSupplements] = useState<IntelligenceSupplements | null>(
    supplementsCache
  );
  const [supplementsLoading, setSupplementsLoading] = useState(!supplementsCache);

  useEffect(() => {
    let cancelled = false;

    void loadIntelligenceSupplements().then((result) => {
      if (!cancelled) {
        setSupplements(result);
        setSupplementsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const center = useMemo(
    () =>
      buildIntelligenceCenter({
        editorial: data,
        workflowAnalytics: supplements?.workflowAnalytics ?? null,
        launchWidgets: supplements?.launchWidgets ?? null,
      }),
    [data, supplements]
  );

  return {
    center,
    loading: (loading && !data) || supplementsLoading,
    error,
  };
}
