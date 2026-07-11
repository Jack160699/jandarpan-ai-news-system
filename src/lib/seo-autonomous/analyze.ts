/**
 * Stage 2 — Analyze: identify optimization opportunities
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { loadRecentArticles } from "@/lib/seo-execution/data-loader";
import { getExecutionDashboard } from "@/lib/seo-execution/repository";
import type { AnalysisOpportunity, ObservationSnapshot } from "@/lib/seo-autonomous/types";
import { AUTONOMOUS_MAX_ARTICLES } from "@/lib/seo-autonomous/config";
import { logAutonomous } from "@/lib/seo-autonomous/logger";

export async function analyze(
  observation: ObservationSnapshot
): Promise<AnalysisOpportunity[]> {
  const opportunities: AnalysisOpportunity[] = [];
  const seen = new Set<string>();

  function add(opp: AnalysisOpportunity): void {
    if (seen.has(opp.article_id)) return;
    seen.add(opp.article_id);
    opportunities.push(opp);
  }

  try {
    const execution = await getExecutionDashboard();
    for (const job of execution?.jobs ?? []) {
      const pending = job.suggestions.filter((s) => s.status === "pending");
      if (pending.length > 0) {
        add({
          article_id: job.generated_article_id,
          article_slug: job.article_slug,
          opportunity_type: "execution_pending",
          score: 80 + pending.length * 2,
          reason: `${pending.length} pending SEO execution suggestions`,
          metadata: { job_id: job.id, pending_count: pending.length },
        });
      }
    }
  } catch {
    /* isolated failure */
  }

  if (isSupabaseConfigured()) {
    const supabase = createAdminServerClient();

    try {
      const { data: lowCtrPages } = await supabase
        .from("gsc_pages" as never)
        .select("page_url, ctr, impressions")
        .lt("ctr", 0.025)
        .gt("impressions", 30)
        .order("impressions", { ascending: false })
        .limit(15);

      for (const page of (lowCtrPages ?? []) as Array<Record<string, unknown>>) {
        const url = String(page.page_url ?? "");
        const slugMatch = url.match(/\/news\/([^/?#]+)/);
        if (!slugMatch) continue;
        const { data: article } = await supabase
          .from("generated_articles")
          .select("id, slug")
          .eq("slug", slugMatch[1])
          .maybeSingle();
        if (!article) continue;
        const row = article as { id: string; slug: string };
        add({
          article_id: row.id,
          article_slug: row.slug,
          opportunity_type: "ctr_opportunity",
          score: 75 + Math.min(Number(page.impressions) / 100, 20),
          reason: `Low CTR (${Number(page.ctr).toFixed(3)}) with ${page.impressions} impressions`,
          metadata: { ctr: page.ctr, impressions: page.impressions },
        });
      }
    } catch {
      /* isolated */
    }

    try {
      const { data: copilotRecs } = await supabase
        .from("ai_recommendations" as never)
        .select("article_id, article_slug, title, priority_score")
        .eq("status", "open")
        .not("article_id", "is", null)
        .order("priority_score", { ascending: false })
        .limit(15);

      for (const rec of (copilotRecs ?? []) as Array<Record<string, unknown>>) {
        if (!rec.article_id) continue;
        add({
          article_id: String(rec.article_id),
          article_slug: String(rec.article_slug ?? ""),
          opportunity_type: "copilot_recommendation",
          score: Number(rec.priority_score ?? 60),
          reason: String(rec.title),
        });
      }
    } catch {
      /* isolated */
    }
  }

  if (opportunities.length < AUTONOMOUS_MAX_ARTICLES) {
    const articles = await loadRecentArticles(AUTONOMOUS_MAX_ARTICLES);
    for (const article of articles) {
      if (seen.has(article.id)) continue;
      let score = 40;
      const reasons: string[] = [];

      if (!article.seo_description || article.seo_description.length < 80) {
        score += 25;
        reasons.push("missing or short meta description");
      }
      if (!article.seo_title || article.seo_title === article.headline) {
        score += 15;
        reasons.push("SEO title not optimized");
      }
      const meta = article.editorial_metadata;
      if (!meta.faq_schema && !meta.faq) {
        score += 10;
        reasons.push("no FAQ schema");
      }
      if (score > 50) {
        add({
          article_id: article.id,
          article_slug: article.slug,
          opportunity_type: "metadata_gap",
          score,
          reason: reasons.join("; "),
        });
      }
    }
  }

  const ranked = opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, AUTONOMOUS_MAX_ARTICLES);

  logAutonomous("analyze_complete", {
    count: ranked.length,
    observationSignals: observation,
  });

  return ranked;
}
