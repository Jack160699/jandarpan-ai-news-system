/**
 * Module 7 — Insight Search across all intelligence
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { listRecommendations } from "@/lib/ai-copilot/repository";
import type { InsightSearchResult } from "@/lib/ai-copilot/types";

export async function searchInsights(query: string): Promise<InsightSearchResult> {
  const q = query.trim().toLowerCase();
  const empty: InsightSearchResult = {
    query,
    articles: [],
    competitors: [],
    queries: [],
    recommendations: [],
    serp: [],
    gsc: [],
  };

  if (!q || !isSupabaseConfigured()) return empty;

  const supabase = createAdminServerClient();
  const pattern = `%${q}%`;

  const [articlesRes, competitorRes, gscRes, serpRes, recs] = await Promise.all([
    supabase
      .from("generated_articles")
      .select("slug, headline, tags, geo_metadata")
      .or(`headline.ilike.${pattern},summary.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(10),
    supabase
      .from("competitor_articles" as never)
      .select("title, url, competitor_sources(name)")
      .ilike("title", pattern)
      .limit(10),
    supabase
      .from("gsc_queries" as never)
      .select("query, clicks, position")
      .ilike("query", pattern)
      .order("clicks", { ascending: false })
      .limit(10),
    supabase
      .from("gsc_queries" as never)
      .select("query, clicks, position, district")
      .or(`district.ilike.${pattern},query.ilike.${pattern}`)
      .limit(10),
    listRecommendations(50),
  ]);

  const serpKeywords = await supabase
    .from("serp_keywords" as never)
    .select("keyword, group_name")
    .ilike("keyword", pattern)
    .limit(10);

  const jandarpanRankings = await supabase
    .from("serp_rankings" as never)
    .select("position, serp_keywords(keyword)")
    .eq("is_jandarpan", true)
    .limit(20);

  const articles = (articlesRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const geo = (r.geo_metadata as Record<string, unknown> | null) ?? {};
    return {
      slug: String(r.slug),
      headline: String(r.headline),
      district: (geo.primary_district as string) ?? undefined,
    };
  });

  const competitors = (competitorRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const source = r.competitor_sources as { name?: string } | null;
    return {
      title: String(r.title),
      source: source?.name ?? "Competitor",
    };
  });

  const gsc = (gscRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      query: String(r.query),
      position: Number(r.position),
    };
  });

  const serp: InsightSearchResult["serp"] = [];
  for (const row of jandarpanRankings.data ?? []) {
    const r = row as Record<string, unknown>;
    const kw = r.serp_keywords as { keyword?: string } | null;
    const keyword = kw?.keyword ?? "";
    if (keyword.toLowerCase().includes(q)) {
      serp.push({ keyword, position: Number(r.position) });
    }
  }
  for (const row of serpKeywords.data ?? []) {
    const r = row as Record<string, unknown>;
    const keyword = String(r.keyword);
    if (!serp.some((s) => s.keyword === keyword)) {
      serp.push({ keyword, position: null });
    }
  }

  const recommendations = recs.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q) ||
      (r.district?.toLowerCase().includes(q) ?? false)
  );

  return {
    query,
    articles,
    competitors,
    queries: (gscRes.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return { query: String(r.query), clicks: Number(r.clicks) };
    }),
    recommendations: recommendations.slice(0, 15),
    serp: serp.slice(0, 10),
    gsc,
  };
}
