/**
 * Competitor Intelligence — Supabase persistence layer
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  articleContentFingerprint,
  hasArticleChanged,
  normalizeCompetitorUrl,
} from "@/lib/competitor-intelligence/dedupe";
import type {
  CompetitorArticleListItem,
  CompetitorArticleRow,
  CompetitorDashboardStats,
  CompetitorRunRow,
  CompetitorSourceRow,
  ParsedCompetitorArticle,
} from "@/lib/competitor-intelligence/types";

type CompetitorTable =
  | "competitor_sources"
  | "competitor_articles"
  | "competitor_runs";

function fromCompetitor(table: CompetitorTable) {
  return createAdminServerClient().from(table as never);
}

function mapArticleRow(row: Record<string, unknown>): CompetitorArticleRow {
  return {
    ...row,
    headings: Array.isArray(row.headings) ? (row.headings as string[]) : [],
    schema_detected:
      (row.schema_detected as Record<string, unknown> | null) ?? {},
    open_graph: (row.open_graph as Record<string, string> | null) ?? {},
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
  } as CompetitorArticleRow;
}

export async function listEnabledCompetitorSources(): Promise<CompetitorSourceRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await fromCompetitor("competitor_sources")
    .select("*")
    .eq("enabled", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CompetitorSourceRow[];
}

export async function listAllCompetitorSources(): Promise<CompetitorSourceRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await fromCompetitor("competitor_sources")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CompetitorSourceRow[];
}

export async function createCompetitorRun(): Promise<string> {
  const { data, error } = await fromCompetitor("competitor_runs")
    .insert({ status: "running" } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function finishCompetitorRun(input: {
  runId: string;
  status: CompetitorRunRow["status"];
  articlesFound: number;
  articlesSaved: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await fromCompetitor("competitor_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: input.status,
      articles_found: input.articlesFound,
      articles_saved: input.articlesSaved,
      errors: input.errors.slice(0, 25),
      metadata: input.metadata ?? {},
    } as never)
    .eq("id", input.runId);

  if (error) throw new Error(error.message);
}

export async function getCompetitorArticleByUrl(
  url: string
): Promise<CompetitorArticleRow | null> {
  const normalized = normalizeCompetitorUrl(url);
  const { data, error } = await fromCompetitor("competitor_articles")
    .select("*")
    .eq("url", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapArticleRow(data as Record<string, unknown>) : null;
}

export async function saveCompetitorArticle(input: {
  sourceId: string;
  article: ParsedCompetitorArticle;
}): Promise<"inserted" | "updated" | "duplicate"> {
  const url = normalizeCompetitorUrl(input.article.url);
  const existing = await getCompetitorArticleByUrl(url);
  const now = new Date().toISOString();

  const payload = {
    source_id: input.sourceId,
    url,
    title: input.article.title,
    description: input.article.description ?? null,
    category: input.article.category ?? null,
    district: input.article.district ?? null,
    language: input.article.language ?? null,
    author: input.article.author ?? null,
    published_at: input.article.publishedAt ?? null,
    fetched_at: now,
    image: input.article.image ?? null,
    word_count: input.article.wordCount ?? null,
    headings: input.article.headings ?? [],
    canonical: input.article.canonical ?? null,
    schema_detected: input.article.schemaDetected ?? {},
    open_graph: input.article.openGraph ?? {},
    metadata: {
      ...(input.article.metadata ?? {}),
      fingerprint: articleContentFingerprint(input.article),
    },
    updated_at: now,
  };

  if (!existing) {
    const { error } = await fromCompetitor("competitor_articles").insert(
      payload as never
    );
    if (error) throw new Error(error.message);
    return "inserted";
  }

  if (!hasArticleChanged(existing, input.article)) {
    const { error } = await fromCompetitor("competitor_articles")
      .update({ fetched_at: now, updated_at: now } as never)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return "duplicate";
  }

  const { error } = await fromCompetitor("competitor_articles")
    .update(payload as never)
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  return "updated";
}

export async function getCompetitorDashboardStats(): Promise<CompetitorDashboardStats> {
  if (!isSupabaseConfigured()) {
    return {
      competitorsMonitored: 0,
      totalArticles: 0,
      newArticlesToday: 0,
      failedCrawls24h: 0,
      latestCrawl: null,
    };
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    sourcesRes,
    totalRes,
    newTodayRes,
    failedRes,
    latestRunRes,
  ] = await Promise.all([
    fromCompetitor("competitor_sources")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true),
    fromCompetitor("competitor_articles").select("id", {
      count: "exact",
      head: true,
    }),
    fromCompetitor("competitor_articles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    fromCompetitor("competitor_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("started_at", dayAgo),
    fromCompetitor("competitor_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const latest = latestRunRes.data as CompetitorRunRow | null;
  const durationMs =
    latest?.started_at && latest?.finished_at
      ? new Date(latest.finished_at).getTime() -
        new Date(latest.started_at).getTime()
      : null;

  return {
    competitorsMonitored: sourcesRes.count ?? 0,
    totalArticles: totalRes.count ?? 0,
    newArticlesToday: newTodayRes.count ?? 0,
    failedCrawls24h: failedRes.count ?? 0,
    latestCrawl: latest
      ? {
          id: latest.id,
          startedAt: latest.started_at,
          finishedAt: latest.finished_at,
          status: latest.status,
          articlesFound: latest.articles_found,
          articlesSaved: latest.articles_saved,
          durationMs,
          errors: Array.isArray(latest.errors)
            ? (latest.errors as string[])
            : [],
        }
      : null,
  };
}

export async function listLatestCompetitorArticles(
  limit = 50
): Promise<CompetitorArticleListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await fromCompetitor("competitor_articles")
    .select("*, competitor_sources(name)")
    .order("fetched_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const source = row.competitor_sources as { name?: string } | null;
    const article = mapArticleRow(row);
    return {
      ...article,
      source_name: source?.name ?? "Unknown",
    };
  });
}
