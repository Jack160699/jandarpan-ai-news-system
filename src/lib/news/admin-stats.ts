/**
 * Admin dashboard stats — server-only (service role)
 */

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export type AdminIngestionDashboard = {
  articleCount: number;
  latestArticles: Array<{
    id: string;
    title: string;
    category: string;
    provider: string | null;
    created_at: string;
  }>;
  categoryCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  recentLogs: Array<{
    id: string;
    status: string;
    inserted: number;
    total_fetched: number;
    created_at: string;
    duration_ms: number | null;
    category_stats: Record<string, number> | null;
    provider_stats: Record<string, number> | null;
  }>;
  recentFailures: Array<{
    id: string;
    title: string | null;
    provider: string | null;
    reason: string;
    created_at: string;
  }>;
  lastFetchAt: string | null;
};

export async function getAdminIngestionStats(): Promise<AdminIngestionDashboard | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();

  const [
    countRes,
    latestRes,
    logsRes,
    failuresRes,
    categoryRes,
  ] = await Promise.all([
    supabase.from("news_articles").select("id", { count: "exact", head: true }),
    supabase
      .from("news_articles")
      .select("id, title, category, source, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ingestion_logs")
      .select(
        "id, status, inserted, total_fetched, created_at, duration_ms, category_stats, provider_stats"
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ingestion_failures")
      .select("id, title, provider, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("news_articles").select("category"),
  ]);

  const categoryCounts: Record<string, number> = {};
  for (const row of categoryRes.data ?? []) {
    const cat = row.category as string;
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }

  const providerCounts: Record<string, number> = {};
  const { data: providerRows } = await supabase
    .from("news_articles")
    .select("source")
    .not("source", "is", null);

  for (const row of providerRows ?? []) {
    const p = row.source as string;
    providerCounts[p] = (providerCounts[p] ?? 0) + 1;
  }

  return {
    articleCount: countRes.count ?? 0,
    latestArticles: (latestRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      provider: row.source,
      created_at: row.created_at,
    })),
    categoryCounts,
    providerCounts,
    recentLogs: (logsRes.data ?? []).map((l) => ({
      ...l,
      category_stats: l.category_stats as Record<string, number> | null,
      provider_stats: l.provider_stats as Record<string, number> | null,
    })),
    recentFailures: failuresRes.data ?? [],
    lastFetchAt: logsRes.data?.[0]?.created_at ?? null,
  };
}
