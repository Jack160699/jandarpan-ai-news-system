/**
 * SEO Intelligence — read-only data loader (competitor_articles + generated_articles)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";
import {
  SEO_ANALYSIS_WINDOW_DAYS,
  SEO_MAX_COMPETITOR_ARTICLES,
  SEO_MAX_JANDARPAN_ARTICLES,
} from "@/lib/seo-intelligence/config";
import { detectDistrictInText } from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisCompetitorArticle,
  AnalysisJandarpanArticle,
  AnalysisSnapshot,
} from "@/lib/seo-intelligence/types";

function analysisSinceIso(now = new Date()): string {
  return new Date(
    now.getTime() - SEO_ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

function mapCompetitorRow(
  row: Record<string, unknown>
): AnalysisCompetitorArticle {
  const source = row.competitor_sources as { name?: string } | null;
  return {
    id: String(row.id),
    source_id: String(row.source_id),
    source_name: source?.name,
    url: String(row.url),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    district:
      (row.district as string | null) ??
      detectDistrictInText(
        `${row.title ?? ""} ${row.description ?? ""}`
      ),
    published_at: (row.published_at as string | null) ?? null,
    fetched_at: String(row.fetched_at),
    word_count: (row.word_count as number | null) ?? null,
    headings: Array.isArray(row.headings) ? (row.headings as string[]) : [],
    open_graph: (row.open_graph as Record<string, string>) ?? {},
    schema_detected: (row.schema_detected as Record<string, unknown>) ?? {},
  };
}

function mapJandarpanRow(
  row: Record<string, unknown>
): AnalysisJandarpanArticle {
  const geo = (row.geo_metadata as Record<string, unknown> | null) ?? {};
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const summary = (row.summary as string | null) ?? null;
  const body = (row.article_body as string | null) ?? "";
  const district =
    (geo.primary_district as string | undefined) ??
    detectDistrictInText(`${row.headline ?? ""} ${summary ?? ""}`);

  return {
    id: String(row.id),
    slug: String(row.slug),
    headline: String(row.headline),
    summary,
    seo_title: (row.seo_title as string | null) ?? null,
    seo_description: (row.seo_description as string | null) ?? null,
    tags,
    published_at: (row.published_at as string | null) ?? null,
    district: district ?? null,
    category: tags[0] ?? null,
    word_count: body ? body.split(/\s+/).filter(Boolean).length : null,
    hero_image_url: (row.hero_image_url as string | null) ?? null,
    editorial_metadata:
      (row.editorial_metadata as Record<string, unknown>) ?? {},
  };
}

export async function loadAnalysisSnapshot(
  now = new Date()
): Promise<AnalysisSnapshot> {
  if (!isSupabaseConfigured()) {
    return {
      competitorArticles: [],
      jandarpanArticles: [],
      loadedAt: now.toISOString(),
    };
  }

  const supabase = createAdminServerClient();
  const since = analysisSinceIso(now);

  const [competitorRes, jandarpanRes] = await Promise.all([
    supabase
      .from("competitor_articles" as never)
      .select("*, competitor_sources(name)")
      .gte("fetched_at", since)
      .order("fetched_at", { ascending: false })
      .limit(SEO_MAX_COMPETITOR_ARTICLES),
    supabase
      .from("generated_articles")
      .select(
        "id,slug,headline,summary,seo_title,seo_description,tags,published_at,hero_image_url,article_body,geo_metadata,editorial_metadata"
      )
      .not("published_at", "is", null)
      .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(SEO_MAX_JANDARPAN_ARTICLES),
  ]);

  if (competitorRes.error) throw new Error(competitorRes.error.message);
  if (jandarpanRes.error) throw new Error(jandarpanRes.error.message);

  return {
    competitorArticles: ((competitorRes.data ?? []) as Array<
      Record<string, unknown>
    >).map(mapCompetitorRow),
    jandarpanArticles: ((jandarpanRes.data ?? []) as Array<
      Record<string, unknown>
    >).map(mapJandarpanRow),
    loadedAt: now.toISOString(),
  };
}
