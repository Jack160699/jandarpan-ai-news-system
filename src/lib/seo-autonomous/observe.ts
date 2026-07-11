/**
 * Stage 1 — Observe: collect intelligence from all existing engines
 */

import { getCompetitorDashboardStats } from "@/lib/competitor-intelligence/repository";
import { listOpportunities as listSerpOpportunities } from "@/lib/serp-intelligence/repository";
import { getExecutionDashboard } from "@/lib/seo-execution/repository";
import { listRecommendations } from "@/lib/ai-copilot/repository";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ObservationSnapshot } from "@/lib/seo-autonomous/types";
import { logAutonomous } from "@/lib/seo-autonomous/logger";

export async function observe(): Promise<ObservationSnapshot> {
  const errors: string[] = [];
  const snapshot: ObservationSnapshot = {
    competitorArticles24h: 0,
    serpOpportunities: 0,
    gscOpenRecommendations: 0,
    executionPending: 0,
    copilotRecommendations: 0,
    gscPagesLowCtr: 0,
    errors,
  };

  try {
    const competitor = await getCompetitorDashboardStats();
    snapshot.competitorArticles24h = competitor?.newArticlesToday ?? 0;
  } catch (err) {
    errors.push(`competitor: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    const serp = await listSerpOpportunities(50);
    snapshot.serpOpportunities = serp.length;
  } catch (err) {
    errors.push(`serp: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    const execution = await getExecutionDashboard();
    snapshot.executionPending = execution?.pendingCount ?? 0;
  } catch (err) {
    errors.push(`execution: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    const recs = await listRecommendations(50);
    snapshot.copilotRecommendations = recs.length;
  } catch (err) {
    errors.push(`copilot: ${err instanceof Error ? err.message : "failed"}`);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminServerClient();
      const [gscRecs, gscPages] = await Promise.all([
        supabase
          .from("gsc_recommendations" as never)
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase
          .from("gsc_pages" as never)
          .select("id", { count: "exact", head: true })
          .lt("ctr", 0.02)
          .gt("impressions", 50),
      ]);
      snapshot.gscOpenRecommendations = gscRecs.count ?? 0;
      snapshot.gscPagesLowCtr = gscPages.count ?? 0;
    } catch (err) {
      errors.push(`gsc: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  logAutonomous("observe_complete", { ...snapshot });
  return snapshot;
}
