/**
 * SERP Intelligence — Supabase persistence + dashboard queries
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  computeAveragePosition,
  computeVisibilityScore,
} from "@/lib/serp-intelligence/rank-tracker";
import { computeCompetitorShare } from "@/lib/serp-intelligence/competitor-share";
import { aggregateFeatureOwnership } from "@/lib/serp-intelligence/feature-analyzer";
import type {
  SerpCollectedSnapshot,
  SerpKeywordRecord,
  SerpMovementRecord,
  SerpOpportunityRecord,
  SerpQuotaStatus,
  SerpRankingsDashboard,
  SerpRankingRecord,
} from "@/lib/serp-intelligence/types";
import type { ExistingRankingState } from "@/lib/serp-intelligence/rank-tracker";
import type { GapReportRecord } from "@/lib/seo-intelligence/types";
import {
  defaultQuotaStatus,
  getSerpQuotaStatus,
} from "@/lib/serp-intelligence/quota-manager";

type SerpTable =
  | "serp_keywords"
  | "serp_snapshots"
  | "serp_rankings"
  | "serp_movements"
  | "serp_opportunities"
  | "serp_quota_usage"
  | "serp_quota_log";

function fromSerp(table: SerpTable) {
  return createAdminServerClient().from(table as never);
}

function mapKeyword(row: Record<string, unknown>): SerpKeywordRecord {
  return {
    id: String(row.id),
    keyword: String(row.keyword),
    group_name: String(row.group_name),
    language: String(row.language),
    region: String(row.region),
    enabled: Boolean(row.enabled),
    is_custom: Boolean(row.is_custom),
  };
}

export async function loadEnabledKeywords(
  limit = 40
): Promise<SerpKeywordRecord[]> {
  const { data, error } = await fromSerp("serp_keywords")
    .select("*")
    .eq("enabled", true)
    .order("group_name")
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapKeyword(row as Record<string, unknown>));
}

export async function loadAllEnabledKeywords(): Promise<SerpKeywordRecord[]> {
  const { data, error } = await fromSerp("serp_keywords")
    .select("*")
    .eq("enabled", true)
    .order("group_name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapKeyword(row as Record<string, unknown>));
}

export async function loadRecentJandarpanRankingDrops(): Promise<
  Map<string, number>
> {
  const map = new Map<string, number>();
  if (!isSupabaseConfigured()) return map;

  const { data, error } = await fromSerp("serp_rankings")
    .select("keyword_id, position_delta")
    .eq("is_jandarpan", true)
    .not("position_delta", "is", null)
    .lt("position_delta", 0);

  if (error) return map;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  for (const row of rows) {
    const keywordId = String(row.keyword_id);
    const drop = Math.abs(Number(row.position_delta));
    const existing = map.get(keywordId) ?? 0;
    map.set(keywordId, Math.max(existing, drop));
  }

  return map;
}

export async function loadTopGapKeywords(
  limit = 50
): Promise<GapReportRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("seo_gap_reports" as never)
    .select("*")
    .order("gap_score", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as GapReportRecord[];
}

export async function getQuotaUsageRow(
  periodMonth: string
): Promise<{
  searches_used: number;
  searches_skipped: number;
  daily_usage: Record<string, number>;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await fromSerp("serp_quota_usage")
    .select("searches_used, searches_skipped, daily_usage")
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    searches_used: Number(row.searches_used ?? 0),
    searches_skipped: Number(row.searches_skipped ?? 0),
    daily_usage:
      row.daily_usage && typeof row.daily_usage === "object"
        ? (row.daily_usage as Record<string, number>)
        : {},
  };
}

export async function incrementQuotaUsage(input: {
  periodMonth: string;
  dayKey: string;
  searchesUsedDelta: number;
  searchesSkippedDelta: number;
}): Promise<{
  searches_used: number;
  searches_skipped: number;
  daily_usage: Record<string, number>;
}> {
  const existing =
    (await getQuotaUsageRow(input.periodMonth)) ?? {
      searches_used: 0,
      searches_skipped: 0,
      daily_usage: {},
    };

  const dailyUsage = { ...existing.daily_usage };
  if (input.searchesUsedDelta > 0) {
    dailyUsage[input.dayKey] =
      (dailyUsage[input.dayKey] ?? 0) + input.searchesUsedDelta;
  }

  const next = {
    period_month: input.periodMonth,
    searches_used: existing.searches_used + input.searchesUsedDelta,
    searches_skipped: existing.searches_skipped + input.searchesSkippedDelta,
    daily_usage: dailyUsage,
    updated_at: new Date().toISOString(),
  };

  const { error } = await fromSerp("serp_quota_usage").upsert(next as never, {
    onConflict: "period_month",
  });
  if (error) throw new Error(error.message);

  return {
    searches_used: next.searches_used,
    searches_skipped: next.searches_skipped,
    daily_usage: next.daily_usage,
  };
}

export async function insertQuotaLog(input: {
  keyword: string;
  keywordId: string;
  action: "search" | "skipped_quota" | "skipped_daily";
  reason?: string | null;
  priorityScore?: number | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await fromSerp("serp_quota_log").insert({
    keyword: input.keyword,
    keyword_id: input.keywordId,
    action: input.action,
    reason: input.reason ?? null,
    priority_score: input.priorityScore ?? null,
    metadata: {},
  } as never);

  if (error) throw new Error(error.message);
}

export async function loadExistingRankingsForKeyword(
  keywordId: string
): Promise<ExistingRankingState[]> {
  const { data, error } = await fromSerp("serp_rankings")
    .select("*")
    .eq("keyword_id", keywordId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      url: String(r.url),
      domain: String(r.domain),
      position: Number(r.position),
      title: (r.title as string | null) ?? null,
      snippet: (r.snippet as string | null) ?? null,
      site: (r.site as string | null) ?? null,
      publish_date: (r.publish_date as string | null) ?? null,
      is_jandarpan: Boolean(r.is_jandarpan),
      competitor_key: (r.competitor_key as string | null) ?? null,
      first_seen: String(r.first_seen),
      best_rank: (r.best_rank as number | null) ?? null,
      worst_rank: (r.worst_rank as number | null) ?? null,
      ranking_history: Array.isArray(r.ranking_history)
        ? (r.ranking_history as Array<{ position: number; captured_at: string }>)
        : [],
    };
  });
}

export async function insertSnapshot(
  keywordId: string,
  snapshot: SerpCollectedSnapshot,
  capturedAt: string
): Promise<string> {
  const { data, error } = await fromSerp("serp_snapshots")
    .insert({
      keyword_id: keywordId,
      captured_at: capturedAt,
      provider: snapshot.provider,
      organic_results: snapshot.organic_results,
      serp_features: snapshot.serp_features,
      raw_metadata: snapshot.raw_metadata ?? {},
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return String((data as { id: string }).id);
}

export async function upsertRanking(
  snapshotId: string,
  ranking: SerpRankingRecord
): Promise<void> {
  const { error } = await fromSerp("serp_rankings").upsert(
    {
      keyword_id: ranking.keyword_id,
      snapshot_id: snapshotId,
      url: ranking.url,
      domain: ranking.domain,
      title: ranking.title,
      snippet: ranking.snippet,
      site: ranking.site,
      publish_date: ranking.publish_date,
      position: ranking.position,
      previous_position: ranking.previous_position,
      position_delta: ranking.position_delta,
      is_jandarpan: ranking.is_jandarpan,
      competitor_key: ranking.competitor_key,
      first_seen: ranking.first_seen,
      last_seen: ranking.last_seen,
      best_rank: ranking.best_rank,
      worst_rank: ranking.worst_rank,
      ranking_history: ranking.ranking_history,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "keyword_id,url" }
  );
  if (error) throw new Error(error.message);
}

export async function deleteLostRankings(
  keywordId: string,
  currentUrls: Set<string>
): Promise<void> {
  const existing = await loadExistingRankingsForKeyword(keywordId);
  const toDelete = existing.filter((r) => !currentUrls.has(r.url));
  for (const row of toDelete) {
    await fromSerp("serp_rankings")
      .delete()
      .eq("keyword_id", keywordId)
      .eq("url", row.url);
  }
}

export async function insertMovements(
  movements: SerpMovementRecord[]
): Promise<number> {
  if (movements.length === 0) return 0;
  const batch = movements.map((m) => ({
    keyword_id: m.keyword_id,
    url: m.url,
    domain: m.domain,
    movement_type: m.movement_type,
    previous_position: m.previous_position,
    current_position: m.current_position,
    position_delta: m.position_delta,
    is_jandarpan: m.is_jandarpan,
    metadata: m.metadata ?? {},
  }));

  const { error } = await fromSerp("serp_movements").insert(batch as never);
  if (error) throw new Error(error.message);
  return batch.length;
}

export async function clearOpenOpportunities(): Promise<void> {
  await fromSerp("serp_opportunities").delete().eq("status", "open");
}

export async function insertOpportunities(
  records: SerpOpportunityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  const batch = records.slice(0, 200).map((r) => ({
    keyword_id: r.keyword_id,
    opportunity_type: r.opportunity_type,
    action_type: r.action_type ?? null,
    priority: r.priority,
    title: r.title,
    reason: r.reason,
    current_position: r.current_position ?? null,
    jandarpan_url: r.jandarpan_url ?? null,
    scores: r.scores ?? {},
    status: "open",
    metadata: r.metadata ?? {},
  }));

  const { error } = await fromSerp("serp_opportunities").insert(batch as never);
  if (error) throw new Error(error.message);
  return batch.length;
}

export async function addCustomKeyword(
  keyword: string,
  groupName: string
): Promise<SerpKeywordRecord | null> {
  const { data, error } = await fromSerp("serp_keywords")
    .upsert(
      {
        keyword: keyword.trim(),
        group_name: groupName,
        enabled: true,
        is_custom: true,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "keyword" }
    )
    .select("*")
    .single();

  if (error) return null;
  return mapKeyword(data as Record<string, unknown>);
}

export async function getSerpRankingsDashboard(): Promise<SerpRankingsDashboard> {
  if (!isSupabaseConfigured()) {
    return emptyDashboard();
  }

  const quota = await getSerpQuotaStatus();

  const [keywordsRes, rankingsRes, movementsRes, opportunitiesRes, snapshotsRes] =
    await Promise.all([
      fromSerp("serp_keywords").select("id, keyword, group_name").eq("enabled", true),
      fromSerp("serp_rankings")
        .select("*")
        .eq("is_jandarpan", true)
        .order("position"),
      fromSerp("serp_movements")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(100),
      fromSerp("serp_opportunities")
        .select("*")
        .eq("status", "open")
        .order("priority")
        .limit(30),
      fromSerp("serp_snapshots")
        .select("keyword_id, captured_at, organic_results, serp_features")
        .order("captured_at", { ascending: false })
        .limit(50),
    ]);

  const keywords = (keywordsRes.data ?? []) as Array<{
    id: string;
    keyword: string;
    group_name: string;
  }>;
  const keywordById = new Map(keywords.map((k) => [k.id, k]));
  const jandarpanRankings = (rankingsRes.data ?? []) as Array<Record<string, unknown>>;

  const positionsByKeyword = new Map<string, number | null>();
  for (const kw of keywords) {
    positionsByKeyword.set(kw.id, null);
  }
  for (const r of jandarpanRankings) {
    positionsByKeyword.set(String(r.keyword_id), Number(r.position));
  }

  const allPositions = [...positionsByKeyword.values()];
  const visibilityScore = computeVisibilityScore(allPositions);
  const averagePosition = computeAveragePosition(allPositions);

  const competitorRows = (await fromSerp("serp_rankings")
    .select("domain, position, position_delta, is_jandarpan")
    .eq("is_jandarpan", false)
    .lte("position", 10)) as { data: Array<Record<string, unknown>> | null };

  const topCompetitors = computeCompetitorShare(
    (competitorRows.data ?? []).map((r) => ({
      domain: String(r.domain),
      position: Number(r.position),
      position_delta: (r.position_delta as number | null) ?? null,
    })),
    keywords.length || 1
  );

  const movements = (movementsRes.data ?? []) as Array<Record<string, unknown>>;
  const improved = movements
    .filter((m) => m.movement_type === "improved_ranking" && m.is_jandarpan)
    .slice(0, 10);
  const dropped = movements
    .filter((m) => m.movement_type === "dropped_ranking" && m.is_jandarpan)
    .slice(0, 10);

  const snapshots = (snapshotsRes.data ?? []) as Array<{
    keyword_id: string;
    captured_at: string;
    organic_results: SerpCollectedSnapshot["organic_results"];
    serp_features: SerpCollectedSnapshot["serp_features"];
  }>;

  const snapshotData: SerpCollectedSnapshot[] = snapshots.map((s) => {
    const kw = keywordById.get(s.keyword_id);
    return {
      keyword: kw?.keyword ?? "",
      provider: "stored",
      organic_results: s.organic_results,
      serp_features: s.serp_features,
    };
  });

  const lastTrackingAt =
    snapshots.length > 0 ? snapshots[0].captured_at : null;

  const opportunities = (opportunitiesRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      keyword_id: String(r.keyword_id),
      opportunity_type: r.opportunity_type,
      action_type: r.action_type,
      priority: r.priority,
      title: String(r.title),
      reason: String(r.reason),
      current_position: (r.current_position as number | null) ?? null,
      jandarpan_url: (r.jandarpan_url as string | null) ?? null,
      scores: (r.scores as Record<string, number>) ?? {},
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    } as SerpOpportunityRecord;
  });

  return {
    quota,
    visibilityScore,
    averagePosition,
    keywordsTracked: keywords.length,
    keywordsRanking: jandarpanRankings.length,
    lastTrackingAt,
    topOpportunities: opportunities.slice(0, 15),
    biggestWinners: improved.map((m) => ({
      keyword: keywordById.get(String(m.keyword_id))?.keyword ?? "",
      url: String(m.url),
      previous_position: Number(m.previous_position),
      current_position: Number(m.current_position),
      position_delta: Number(m.position_delta),
    })),
    biggestLosers: dropped.map((m) => ({
      keyword: keywordById.get(String(m.keyword_id))?.keyword ?? "",
      url: String(m.url),
      previous_position: Number(m.previous_position),
      current_position: Number(m.current_position),
      position_delta: Number(m.position_delta),
    })),
    topCompetitors: topCompetitors.slice(0, 8),
    serpFeatureOwnership: aggregateFeatureOwnership(snapshotData),
    keywordTrends: keywords.map((kw) => {
      const ranking = jandarpanRankings.find(
        (r) => String(r.keyword_id) === kw.id
      );
      return {
        keyword: kw.keyword,
        group_name: kw.group_name,
        current_position: ranking ? Number(ranking.position) : null,
        previous_position: ranking
          ? (ranking.previous_position as number | null)
          : null,
        movement: ranking
          ? ranking.position_delta !== null && Number(ranking.position_delta) > 0
            ? "improved_ranking"
            : ranking.position_delta !== null && Number(ranking.position_delta) < 0
              ? "dropped_ranking"
              : ranking.previous_position === null
                ? "new_ranking"
                : "unchanged"
          : "not_ranking",
      };
    }),
    jandarpanRankings: jandarpanRankings.map((r) => {
      const kw = keywordById.get(String(r.keyword_id));
      return {
        keyword: kw?.keyword ?? "",
        group_name: kw?.group_name ?? "",
        position: Number(r.position),
        url: String(r.url),
        title: (r.title as string | null) ?? null,
        position_delta: (r.position_delta as number | null) ?? null,
      };
    }),
  };
}

function emptyDashboard(): SerpRankingsDashboard {
  return {
    quota: defaultQuotaStatus(),
    visibilityScore: 0,
    averagePosition: null,
    keywordsTracked: 0,
    keywordsRanking: 0,
    lastTrackingAt: null,
    topOpportunities: [],
    biggestWinners: [],
    biggestLosers: [],
    topCompetitors: [],
    serpFeatureOwnership: [],
    keywordTrends: [],
    jandarpanRankings: [],
  };
}

export async function listKeywords(): Promise<SerpKeywordRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await fromSerp("serp_keywords")
    .select("*")
    .order("group_name");
  if (error) return [];
  return (data ?? []).map((row) => mapKeyword(row as Record<string, unknown>));
}

export async function listOpportunities(
  limit = 50
): Promise<SerpOpportunityRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await fromSerp("serp_opportunities")
    .select("*")
    .eq("status", "open")
    .order("priority")
    .limit(limit);
  if (error) return [];

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      keyword_id: String(r.keyword_id),
      opportunity_type: r.opportunity_type,
      action_type: r.action_type,
      priority: r.priority,
      title: String(r.title),
      reason: String(r.reason),
      current_position: (r.current_position as number | null) ?? null,
      jandarpan_url: (r.jandarpan_url as string | null) ?? null,
      scores: (r.scores as Record<string, number>) ?? {},
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    } as SerpOpportunityRecord;
  });
}
