/**
 * Module 3 — Unified Recommendation Engine
 * Merges recommendations from all intelligence modules (read-only sources).
 */

import { getCompetitorDashboardStats } from "@/lib/competitor-intelligence/repository";
import { getSeoIntelligenceDashboard } from "@/lib/seo-intelligence/repository";
import { listOpportunities as listSerpOpportunities } from "@/lib/serp-intelligence/repository";
import { getExecutionDashboard } from "@/lib/seo-execution/repository";
import { rankDrafts } from "@/lib/ai-copilot/priority-queue";
import type { RecommendationDraft } from "@/lib/ai-copilot/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export async function collectRecommendationDrafts(): Promise<RecommendationDraft[]> {
  const drafts: RecommendationDraft[] = [];

  const [seo, serp, execution, competitor] = await Promise.all([
    getSeoIntelligenceDashboard().catch(() => null),
    listSerpOpportunities(30).catch(() => []),
    getExecutionDashboard().catch(() => null),
    getCompetitorDashboardStats().catch(() => null),
  ]);

  let gscRecs: Array<Record<string, unknown>> = [];
  if (isSupabaseConfigured()) {
    const { data } = await createAdminServerClient()
      .from("gsc_recommendations" as never)
      .select("*")
      .eq("status", "open")
      .order("priority")
      .limit(30);
    gscRecs = (data ?? []) as Array<Record<string, unknown>>;
  }

  if (seo) {
    for (const rec of seo.recommendations ?? []) {
      drafts.push({
        external_key: `seo_intel:${rec.type}:${rec.title}`,
        source: "seo_intelligence",
        priority: rec.priority,
        confidence: 0.75,
        district: rec.district ?? null,
        category: rec.keyword ?? null,
        title: rec.title,
        reason: rec.reason,
        recommended_action: rec.type,
        metadata: { scores: rec.scores },
      });
    }
    for (const gap of seo.missingStories ?? []) {
      drafts.push({
        external_key: `seo_gap:${gap.keyword ?? gap.reason}`,
        source: "seo_intelligence",
        priority: gap.priority ?? "high",
        confidence: 0.8,
        district: gap.district ?? null,
        title: `Missing story: ${gap.keyword ?? "competitor gap"}`,
        reason: gap.reason,
        recommended_action: "publish_story",
        metadata: { gap },
      });
    }
  }

  for (const opp of serp) {
    drafts.push({
      external_key: `serp:${opp.keyword_id}:${opp.opportunity_type}`,
      source: "serp_tracker",
      priority: opp.priority,
      confidence: 0.7,
      title: opp.title,
      reason: opp.reason,
      recommended_action: opp.action_type ?? opp.opportunity_type,
      metadata: { current_position: opp.current_position, scores: opp.scores },
    });
  }

  for (const rec of gscRecs) {
    drafts.push({
      external_key: `gsc:${rec.query ?? rec.title}:${rec.recommendation_type}`,
      source: "search_console",
      priority: (rec.priority as RecommendationDraft["priority"]) ?? "medium",
      confidence: 0.78,
      title: String(rec.title),
      reason: String(rec.reason),
      recommended_action: String(rec.recommendation_type),
      metadata: { query: rec.query, scores: rec.scores },
    });
  }

  if (execution) {
    for (const job of execution.jobs) {
      for (const s of job.suggestions.filter((x) => x.status === "pending")) {
        drafts.push({
          external_key: `exec:${s.id}`,
          source: "execution_engine",
          priority: s.priority,
          confidence: s.confidence,
          article_id: job.generated_article_id,
          article_slug: job.article_slug,
          title: `${s.suggestion_type}: ${job.article_slug}`,
          reason: s.reason,
          recommended_action: s.suggestion_type,
          metadata: { job_id: job.id, suggestion_id: s.id },
        });
      }
    }
  }

  if (competitor && competitor.newArticlesToday > 0) {
    drafts.push({
      external_key: `competitor:activity:${new Date().toISOString().slice(0, 10)}`,
      source: "competitor_intelligence",
      priority: competitor.newArticlesToday > 20 ? "high" : "medium",
      confidence: 0.65,
      title: "Competitor publishing activity elevated",
      reason: `${competitor.newArticlesToday} competitor articles today across ${competitor.competitorsMonitored} monitored sources.`,
      recommended_action: "review_competitor_feed",
      metadata: { newArticlesToday: competitor.newArticlesToday },
    });
  }

  if (isSupabaseConfigured()) {
    const { data: gaps } = await createAdminServerClient()
      .from("seo_gap_reports" as never)
      .select("keyword, reason, district, priority, gap_score")
      .eq("gap_type", "missing_story")
      .order("gap_score", { ascending: false })
      .limit(15);

    for (const row of gaps ?? []) {
      const g = row as Record<string, unknown>;
      drafts.push({
        external_key: `competitor_gap:${g.keyword ?? g.reason}`,
        source: "competitor_intelligence",
        priority: (g.priority as RecommendationDraft["priority"]) ?? "medium",
        confidence: Math.min(Number(g.gap_score ?? 0.5), 1),
        district: (g.district as string) ?? null,
        title: `Competitor gap: ${g.keyword ?? "story"}`,
        reason: String(g.reason),
        recommended_action: "cover_story",
        metadata: { gap_score: g.gap_score },
      });
    }
  }

  return rankDrafts(drafts);
}
