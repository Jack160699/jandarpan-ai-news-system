/**
 * Stage 7 — Measurement after deployment
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { saveActionResults } from "@/lib/seo-autonomous/repository";
import type { MetricType, SeoAction } from "@/lib/seo-autonomous/types";
import { logAutonomous } from "@/lib/seo-autonomous/logger";

export async function measureAction(action: SeoAction): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  const metrics: Array<{
    metric_type: MetricType;
    baseline_value: number | null;
    current_value: number | null;
    delta: number | null;
  }> = [];

  try {
    const { data: gscPage } = await supabase
      .from("gsc_pages" as never)
      .select("ctr, impressions, position")
      .ilike("page_url", `%${action.article_slug}%`)
      .order("impressions", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gscPage) {
      const row = gscPage as Record<string, unknown>;
      metrics.push({
        metric_type: "ctr",
        baseline_value: null,
        current_value: Number(row.ctr),
        delta: null,
      });
      metrics.push({
        metric_type: "impressions",
        baseline_value: null,
        current_value: Number(row.impressions),
        delta: null,
      });
      metrics.push({
        metric_type: "position",
        baseline_value: null,
        current_value: Number(row.position),
        delta: null,
      });
    }
  } catch {
    /* isolated */
  }

  try {
    const { data: rankings } = await supabase
      .from("serp_rankings" as never)
      .select("position")
      .eq("is_jandarpan", true)
      .limit(5);

    if (rankings?.length) {
      const positions = (rankings as Array<{ position: number }>).map((r) =>
        Number(r.position)
      );
      const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
      metrics.push({
        metric_type: "ranking",
        baseline_value: null,
        current_value: avg,
        delta: null,
      });
    }
  } catch {
    /* isolated */
  }

  const { data: articleRow } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", action.article_id)
    .maybeSingle();

  if (articleRow) {
    const meta = (articleRow as { editorial_metadata: Record<string, unknown> })
      .editorial_metadata;
    const linkCount = Array.isArray(meta.related_slugs)
      ? (meta.related_slugs as string[]).length
      : 0;
    metrics.push({
      metric_type: "internal_links",
      baseline_value: null,
      current_value: linkCount,
      delta: null,
    });
    metrics.push({
      metric_type: "schema_coverage",
      baseline_value: null,
      current_value: meta.faq_schema || meta.faq ? 1 : 0,
      delta: null,
    });
  }

  if (metrics.length > 0) {
    await saveActionResults(action.id, metrics);
  }

  logAutonomous("measure_complete", {
    actionId: action.id,
    metrics: metrics.length,
  });
}
