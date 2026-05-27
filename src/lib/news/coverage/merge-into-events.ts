/**
 * Merge new signals into existing live events — evolving coverage
 */

import { createAdminServerClient } from "@/lib/supabase";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import { titleSimilarity } from "@/lib/news/normalize";
import { tokenizeForSimilarity } from "@/lib/news/ai/similarity";
import { computeClusterConfidence } from "@/lib/news/coverage/confidence";
import {
  buildCoverageHeadline,
  buildCoverageSlug,
  shouldEnableLiveCoverage,
} from "@/lib/news/coverage/coverage-headline";
import type {
  CoverageUpdateInsert,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";
import { asJsonObject, jsonObjectFrom } from "@/types/json";

const MERGE_INTO_EVENT_THRESHOLD = 0.68;
const ACTIVE_EVENT_HOURS = 96;

export type SignalEventMatch = {
  signal: NewsSignalRow;
  event: NewsEventRow;
  similarity: number;
};

export async function fetchActiveEvents(
  lookbackHours = ACTIVE_EVENT_HOURS
): Promise<NewsEventRow[]> {
  const supabase = createAdminServerClient();
  const cutoff = new Date(
    Date.now() - lookbackHours * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("news_events")
    .select("*")
    .gte("updated_at", cutoff)
    .eq("coverage_status", "active")
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) return [];
  return (data ?? []) as NewsEventRow[];
}

function signalEventSimilarity(
  signal: NewsSignalRow,
  event: NewsEventRow
): number {
  const titleSim = titleSimilarity(signal.title, event.canonical_title);
  const signalTokens = tokenizeForSimilarity(
    `${signal.title} ${signal.raw_content ?? ""}`
  );
  const eventTokens = tokenizeForSimilarity(
    `${event.canonical_title} ${event.event_summary ?? ""}`
  );
  const setB = new Set(eventTokens);
  let overlap = 0;
  for (const t of signalTokens) {
    if (setB.has(t)) overlap++;
  }
  const tokenOverlap =
    signalTokens.length && eventTokens.length
      ? overlap / Math.sqrt(signalTokens.length * eventTokens.length)
      : 0;

  let score = titleSim * 0.55 + tokenOverlap * 0.35;
  if (signal.category === event.category) score += 0.08;
  if ((signal.region ?? "") === (event.region ?? "")) score += 0.05;
  return Math.min(1, score);
}

export function matchSignalsToActiveEvents(
  signals: NewsSignalRow[],
  events: NewsEventRow[]
): {
  matches: SignalEventMatch[];
  unmatched: NewsSignalRow[];
} {
  const matches: SignalEventMatch[] = [];
  const unmatched: NewsSignalRow[] = [];

  for (const signal of signals) {
    let best: { event: NewsEventRow; similarity: number } | null = null;

    for (const event of events) {
      const sim = signalEventSimilarity(signal, event);
      if (sim >= MERGE_INTO_EVENT_THRESHOLD && (!best || sim > best.similarity)) {
        best = { event, similarity: sim };
      }
    }

    if (best) {
      matches.push({
        signal,
        event: best.event,
        similarity: best.similarity,
      });
    } else {
      unmatched.push(signal);
    }
  }

  return { matches, unmatched };
}

function buildSourceAttribution(signals: NewsSignalRow[]) {
  return signals.map((s) => ({
    signal_id: s.id,
    source: s.source,
    provider: s.provider,
    article_url: s.article_url,
    published_at: s.published_at,
    confidence: scoreSourceConfidence(s),
  }));
}

export async function mergeSignalsIntoEvent(
  event: NewsEventRow,
  newSignals: NewsSignalRow[],
  options?: { avgSimilarity?: number; isBreaking?: boolean }
): Promise<{ event: NewsEventRow; updateId: string | null }> {
  const supabase = createAdminServerClient();
  const existingIds = new Set(event.signal_ids ?? []);
  const mergedSignals: NewsSignalRow[] = [];

  for (const s of newSignals) {
    if (!existingIds.has(s.id)) {
      existingIds.add(s.id);
      mergedSignals.push(s);
    }
  }

  if (!mergedSignals.length) {
    return { event, updateId: null };
  }

  const { data: existingSignalRows } = await supabase
    .from("news_signals")
    .select("*")
    .in("id", [...existingIds]);

  const allSignals = (existingSignalRows ?? []) as NewsSignalRow[];
  const confidence = computeClusterConfidence({
    signals: allSignals,
    avgSimilarity: options?.avgSimilarity ?? 0.75,
    mergeReasons: ["ongoing_event_merge"],
  });

  const sourceCount = allSignals.length;
  const isLive = shouldEnableLiveCoverage({
    sourceCount,
    urgencyScore: Number(event.urgency_score),
    clusterConfidence: confidence.score,
    isBreaking: options?.isBreaking,
  });

  const coverageHeadline = buildCoverageHeadline(
    event.canonical_title,
    allSignals[0]?.language
  );
  const coverageSlug =
    event.coverage_slug ??
    buildCoverageSlug(event.canonical_title, event.id);

  const meta = jsonObjectFrom(event.clustering_metadata);
  const history = Array.isArray(meta.merge_history)
    ? [...(meta.merge_history as unknown[])]
    : [];
  history.push({
    at: new Date().toISOString(),
    added_signals: mergedSignals.map((s) => s.id),
    similarity: options?.avgSimilarity,
    confidence: confidence.score,
  });

  const { data: updated, error } = await supabase
    .from("news_events")
    .update({
      signal_ids: [...existingIds],
      source_count: sourceCount,
      cluster_confidence: confidence.score,
      is_live: isLive,
      coverage_slug: coverageSlug,
      coverage_headline: coverageHeadline,
      updated_at: new Date().toISOString(),
      clustering_metadata: asJsonObject({
        ...meta,
        merge_history: history.slice(-20),
        last_merge_at: new Date().toISOString(),
        cluster_confidence_report: confidence,
        source_attribution: buildSourceAttribution(allSignals),
      } as Record<string, unknown>),
    } satisfies Partial<import("@/lib/types/newsroom").NewsEventInsert>)
    .eq("id", event.id)
    .select("*")
    .single();

  if (error || !updated) {
    return { event, updateId: null };
  }

  const breaking =
    options?.isBreaking ??
    /\bbreaking\b|ब्रेकिंग|लाइव/i.test(
      mergedSignals.map((s) => s.title).join(" ")
    );

  const updateRow: CoverageUpdateInsert = {
    event_id: event.id,
    update_type: breaking ? "breaking" : "development",
    headline: mergedSignals[0].title,
    summary: mergedSignals[0].raw_content?.slice(0, 400) ?? null,
    signal_ids: mergedSignals.map((s) => s.id),
    source_attribution: buildSourceAttribution(mergedSignals),
    cluster_confidence: confidence.score,
    is_breaking: breaking,
    published_at:
      mergedSignals[0].published_at ?? new Date().toISOString(),
  };

  const { data: upd } = await supabase
    .from("coverage_updates")
    .insert(updateRow)
    .select("id")
    .single();

  return {
    event: updated as NewsEventRow,
    updateId: upd?.id ?? null,
  };
}
