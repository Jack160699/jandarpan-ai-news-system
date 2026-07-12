"use client";

import { useMemo } from "react";
import { buildIntelligenceCenter } from "@/lib/admin/intelligence-center";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import type { CoverageInsightsVm } from "@/lib/newsroom-health/build-coverage-insights";
import type { CoverageOpportunityVm } from "@/lib/newsroom-health/build-coverage-opportunities";
import type { NewsroomHealthVm } from "@/lib/newsroom-health/build-health";

export type EditorialIntelligenceSlices = {
  health: NewsroomHealthVm | null;
  coverage: CoverageInsightsVm | null;
  opportunities: CoverageOpportunityVm | null;
};

/**
 * Single-pass editorial intelligence projection for admin overview panels.
 */
export function useEditorialIntelligenceSlices(
  editorial: EditorialDashboardSnapshot | null
): EditorialIntelligenceSlices {
  return useMemo(() => {
    const center = buildIntelligenceCenter({ editorial });
    return {
      health: center.health.hasLayer ? center.health : null,
      coverage: center.coverage.hasLayer ? center.coverage : null,
      opportunities: center.opportunities.hasLayer ? center.opportunities : null,
    };
  }, [editorial]);
}
