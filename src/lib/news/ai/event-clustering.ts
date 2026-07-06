/**
 * AI-powered event clustering — merge duplicate news_signals → news_events
 */

import { createAdminServerClient } from "@/lib/supabase";
import { titleSimilarity } from "@/lib/news/normalize";
import { extractNamedEntities, entityOverlapRatio } from "@/lib/news/ai/entities";
import {
  buildTfIdfVector,
  computeIdf,
  combinedStorySimilarity,
  tokenizeForSimilarity,
  type SparseVector,
} from "@/lib/news/ai/similarity";
import { computeClusterConfidence } from "@/lib/news/coverage/confidence";
import {
  buildCoverageHeadline,
  buildCoverageSlug,
  shouldEnableLiveCoverage,
} from "@/lib/news/coverage/coverage-headline";
import {
  fetchActiveEvents,
  matchSignalsToActiveEvents,
  mergeSignalsIntoEvent,
} from "@/lib/news/coverage/merge-into-events";
import { mergeGeoMetadata, tagGeoFromContent } from "@/lib/regional/geo-tagging";
import { logNewsroom } from "@/lib/newsroom/logger";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";
import { recordDirectEmbedding } from "@/lib/observability/openai-cost";
import { asJson, asJsonObject } from "@/types/json";
import type { NewsEventInsert } from "@/lib/types/newsroom";
import type { NewsSignalRow } from "@/lib/types/newsroom";

const CLUSTER_THRESHOLD = 0.72;
const TITLE_DUPLICATE_THRESHOLD = 0.88;
const DEFAULT_LIMIT = 120;
const DEFAULT_LOOKBACK_HOURS = 72;

const REGIONAL_RE =
  /raipur|bastar|bilaspur|chhattisgarh|छत्तीसगढ|रायपुर|बस्तर/i;
const BREAKING_RE =
  /\bbreaking\b|\blive\b|\burgent\b|ब्रेकिंग|लाइव|बड़ी खबर/i;

export type SignalFeatures = {
  signalId: string;
  tokens: string[];
  vector: SparseVector;
  entities: Set<string>;
  embedding: number[] | null;
  sourceConfidence: number;
};

export type DuplicateDetectionAnalytics = {
  signalsFetched: number;
  unprocessedCount: number;
  pairsCompared: number;
  duplicatePairs: number;
  clustersFormed: number;
  singletonClusters: number;
  multiSourceClusters: number;
  avgClusterSize: number;
  avgSimilarity: number;
  method: "keyword_tfidf" | "embedding_hybrid";
  sourceConfidenceAvg: number;
};

export type ClusterSignalsResult = {
  eventsCreated: number;
  eventsUpdated: number;
  signalsProcessed: number;
  signalsClustered: number;
  duplicatesMerged: number;
  skipped: boolean;
  analytics: DuplicateDetectionAnalytics;
};

type InternalCluster = {
  signals: NewsSignalRow[];
  features: SignalFeatures[];
  mergeReasons: string[];
  avgSimilarity: number;
};

function logClustering(
  message: string,
  context?: Record<string, unknown>
): void {
  console.log(
    `[event-clustering] ${message}`,
    context ? JSON.stringify(context) : ""
  );
  logNewsroom("events", message, context);
}

/** Provider + regional weight for canonical source picking */
export function scoreSourceConfidence(signal: NewsSignalRow): number {
  let score = 0.5;
  if (signal.provider === "rss") score += 0.25;
  if (signal.region === "chhattisgarh") score += 0.2;
  if (REGIONAL_RE.test(`${signal.title} ${signal.raw_content ?? ""}`)) {
    score += 0.15;
  }
  if (signal.source?.toLowerCase().includes("pib")) score += 0.1;
  return Math.min(1, score);
}

function hoursBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 48;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 3_600_000;
}

function inferCanonicalCategory(signals: NewsSignalRow[]): string {
  const counts = new Map<string, number>();
  for (const s of signals) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "world";
}

function inferCanonicalRegion(signals: NewsSignalRow[]): string | null {
  for (const s of signals) {
    if (s.region === "chhattisgarh") return "chhattisgarh";
  }
  for (const s of signals) {
    if (s.region === "india") return "india";
  }
  return signals[0]?.region ?? null;
}

function computeUrgencyScore(signals: NewsSignalRow[]): number {
  const count = signals.length;
  const newest = signals.reduce((best, s) => {
    const t = s.published_at ? new Date(s.published_at).getTime() : 0;
    return t > best ? t : best;
  }, 0);
  const ageH = newest ? (Date.now() - newest) / 3_600_000 : 48;

  let score = Math.min(40, count * 12);
  if (ageH < 2) score += 35;
  else if (ageH < 6) score += 25;
  else if (ageH < 24) score += 12;

  const text = signals.map((s) => `${s.title} ${s.raw_content ?? ""}`).join(" ");
  if (BREAKING_RE.test(text)) score += 20;
  if (inferCanonicalRegion(signals) === "chhattisgarh") score += 15;

  return Math.min(100, Math.round(score));
}

function pickCanonicalTitle(signals: NewsSignalRow[]): string {
  const ranked = [...signals].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );
  return ranked[0]?.title ?? signals[0].title;
}

function buildEventSummary(signals: NewsSignalRow[]): string {
  const snippets = signals
    .map((s) => s.raw_content?.trim() || s.title)
    .filter(Boolean)
    .slice(0, 4);
  return snippets.join(" ").slice(0, 600);
}

function buildClusteringMetadata(
  cluster: InternalCluster,
  method: DuplicateDetectionAnalytics["method"]
): Record<string, unknown> {
  const sources = cluster.signals.map((s) => ({
    id: s.id,
    source: s.source,
    provider: s.provider,
    article_url: s.article_url,
    published_at: s.published_at,
    confidence: scoreSourceConfidence(s),
  }));

  return {
    method,
    cluster_size: cluster.signals.length,
    avg_similarity: Math.round(cluster.avgSimilarity * 1000) / 1000,
    merge_reasons: [...new Set(cluster.mergeReasons)],
    sources,
    title_variants: cluster.signals.map((s) => s.title),
    clustered_at: new Date().toISOString(),
    embedding_ready: cluster.features.some((f) => f.embedding != null),
  };
}

async function fetchEmbeddings(
  texts: string[]
): Promise<(number[] | null)[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (process.env.NEWSROOM_USE_EMBEDDINGS !== "true" || !apiKey) {
    return texts.map(() => null);
  }

  try {
    const model =
      process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
    const started = Date.now();
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: texts.map((t) => t.slice(0, 2000)),
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      recordDirectEmbedding({
        operation: "cluster_embeddings",
        model,
        texts,
        latencyMs,
        success: false,
        context: { worker: "event_cluster" },
      });
      return texts.map(() => null);
    }

    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    recordDirectEmbedding({
      operation: "cluster_embeddings",
      model,
      texts,
      json,
      latencyMs,
      success: true,
      context: { worker: "event_cluster" },
    });
    return (json.data ?? []).map((d) => d.embedding ?? null);
  } catch {
    return texts.map(() => null);
  }
}

function embeddingCosine(a: number[] | null, b: number[] | null): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}

export async function fetchUnprocessedSignals(
  limit = DEFAULT_LIMIT,
  lookbackHours = DEFAULT_LOOKBACK_HOURS
): Promise<NewsSignalRow[]> {
  const supabase = createAdminServerClient();
  const cutoff = new Date(
    Date.now() - lookbackHours * 60 * 60 * 1000
  ).toISOString();

  const { data: events } = await supabase
    .from("news_events")
    .select("signal_ids");

  const clusteredIds = new Set<string>();
  for (const e of events ?? []) {
    for (const id of e.signal_ids ?? []) {
      clusteredIds.add(id);
    }
  }

  const { data: signals, error } = await supabase
    .from("news_signals")
    .select("*")
    .or(`published_at.gte.${cutoff},published_at.is.null`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit * 2);

  if (error) {
    logClustering("fetch_signals_error", { message: error.message });
    return [];
  }

  const unprocessed = (signals ?? []).filter((s) => !clusteredIds.has(s.id));
  return unprocessed.slice(0, limit);
}

function buildSignalFeatures(
  signals: NewsSignalRow[],
  idf: Map<string, number>,
  embeddings: (number[] | null)[]
): SignalFeatures[] {
  return signals.map((signal, i) => {
    const text = `${signal.title} ${signal.raw_content ?? ""}`;
    const tokens = tokenizeForSimilarity(text);
    return {
      signalId: signal.id,
      tokens,
      vector: buildTfIdfVector(tokens, idf),
      entities: extractNamedEntities(text),
      embedding: embeddings[i] ?? null,
      sourceConfidence: scoreSourceConfidence(signal),
    };
  });
}

/**
 * Greedy agglomerative clustering with union of similar stories
 */
export function clusterSignalsLocally(
  signals: NewsSignalRow[],
  features: SignalFeatures[]
): { clusters: InternalCluster[]; analytics: Partial<DuplicateDetectionAnalytics> } {
  const n = signals.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i: number, j: number): void {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[rj] = ri;
  }

  let pairsCompared = 0;
  let duplicatePairs = 0;
  let similaritySum = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const si = signals[i];
      const sj = signals[j];
      const fi = features[i];
      const fj = features[j];

      if (
        si.category !== sj.category &&
        titleSimilarity(si.title, sj.title) < 0.82
      ) {
        continue;
      }

      pairsCompared++;

      const hoursApart = hoursBetween(si.published_at, sj.published_at);
      let sim = combinedStorySimilarity({
        titleA: si.title,
        titleB: sj.title,
        textA: si.raw_content ?? "",
        textB: sj.raw_content ?? "",
        tokensA: fi.tokens,
        tokensB: fj.tokens,
        vectorA: fi.vector,
        vectorB: fj.vector,
        entityOverlap: entityOverlapRatio(fi.entities, fj.entities),
        categoryMatch: si.category === sj.category,
        regionMatch: (si.region ?? "") === (sj.region ?? ""),
        hoursApart,
      });

      const embSim = embeddingCosine(fi.embedding, fj.embedding);
      if (embSim > 0.85) {
        sim = Math.max(sim, 0.85 * embSim + 0.15 * sim);
      }

      similaritySum += sim;

      const titleDup = titleSimilarity(si.title, sj.title) >= TITLE_DUPLICATE_THRESHOLD;
      const merge = sim >= CLUSTER_THRESHOLD || titleDup;

      if (merge) {
        duplicatePairs++;
        union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const clusters: InternalCluster[] = [];

  for (const indices of groups.values()) {
    const clusterSignals = indices.map((i) => signals[i]);
    const clusterFeatures = indices.map((i) => features[i]);
    const mergeReasons: string[] = [];
    let simAccum = 0;
    let simCount = 0;

    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const sim = combinedStorySimilarity({
          titleA: signals[indices[a]].title,
          titleB: signals[indices[b]].title,
          textA: signals[indices[a]].raw_content ?? "",
          textB: signals[indices[b]].raw_content ?? "",
          tokensA: features[indices[a]].tokens,
          tokensB: features[indices[b]].tokens,
          vectorA: features[indices[a]].vector,
          vectorB: features[indices[b]].vector,
          entityOverlap: entityOverlapRatio(
            features[indices[a]].entities,
            features[indices[b]].entities
          ),
          categoryMatch:
            signals[indices[a]].category === signals[indices[b]].category,
          regionMatch:
            (signals[indices[a]].region ?? "") ===
            (signals[indices[b]].region ?? ""),
          hoursApart: hoursBetween(
            signals[indices[a]].published_at,
            signals[indices[b]].published_at
          ),
        });
        simAccum += sim;
        simCount++;
        if (sim >= CLUSTER_THRESHOLD) mergeReasons.push("tfidf_title_entity_match");
        if (titleSimilarity(signals[indices[a]].title, signals[indices[b]].title) >= TITLE_DUPLICATE_THRESHOLD) {
          mergeReasons.push("title_near_duplicate");
        }
      }
    }

    clusters.push({
      signals: clusterSignals,
      features: clusterFeatures,
      mergeReasons,
      avgSimilarity: simCount ? simAccum / simCount : 1,
    });
  }

  return {
    clusters,
    analytics: {
      pairsCompared,
      duplicatePairs,
      avgSimilarity: pairsCompared ? similaritySum / pairsCompared : 0,
    },
  };
}

/**
 * Main entry — fetch unprocessed signals, cluster, persist news_events
 */
export async function clusterSignalsIntoEvents(options?: {
  limit?: number;
  lookbackHours?: number;
}): Promise<ClusterSignalsResult> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const lookbackHours = options?.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;

  const emptyAnalytics: DuplicateDetectionAnalytics = {
    signalsFetched: 0,
    unprocessedCount: 0,
    pairsCompared: 0,
    duplicatePairs: 0,
    clustersFormed: 0,
    singletonClusters: 0,
    multiSourceClusters: 0,
    avgClusterSize: 0,
    avgSimilarity: 0,
    method: "keyword_tfidf",
    sourceConfidenceAvg: 0,
  };

  const signals = await fetchUnprocessedSignals(limit, lookbackHours);

  if (!signals.length) {
    logClustering("no_unprocessed_signals", { limit, lookbackHours });
    return {
      eventsCreated: 0,
      eventsUpdated: 0,
      signalsProcessed: 0,
      signalsClustered: 0,
      duplicatesMerged: 0,
      skipped: true,
      analytics: emptyAnalytics,
    };
  }

  logClustering("clustering_start", { count: signals.length });

  const activeEvents = await fetchActiveEvents();
  const { matches, unmatched } = matchSignalsToActiveEvents(
    signals,
    activeEvents
  );

  let eventsUpdated = 0;
  const matchedByEvent = new Map<string, NewsSignalRow[]>();
  for (const m of matches) {
    const list = matchedByEvent.get(m.event.id) ?? [];
    list.push(m.signal);
    matchedByEvent.set(m.event.id, list);
  }

  for (const [eventId, batch] of matchedByEvent) {
    const event = activeEvents.find((e) => e.id === eventId);
    if (!event) continue;
    const avgSim =
      matches
        .filter((x) => x.event.id === eventId)
        .reduce((s, x) => s + x.similarity, 0) / batch.length;
    const merged = await mergeSignalsIntoEvent(event, batch, {
      avgSimilarity: avgSim,
    });
    if (merged.updateId) eventsUpdated++;
  }

  const signalsToCluster = unmatched.length ? unmatched : [];

  if (!signalsToCluster.length && eventsUpdated > 0) {
    const analytics: DuplicateDetectionAnalytics = {
      ...emptyAnalytics,
      signalsFetched: signals.length,
      unprocessedCount: signals.length,
      multiSourceClusters: eventsUpdated,
    };
    logClustering("merged_into_existing_only", { eventsUpdated });
    return {
      eventsCreated: 0,
      eventsUpdated,
      signalsProcessed: signals.length,
      signalsClustered: signals.length,
      duplicatesMerged: matches.length,
      skipped: false,
      analytics,
    };
  }

  if (!signalsToCluster.length) {
    return {
      eventsCreated: 0,
      eventsUpdated,
      signalsProcessed: signals.length,
      signalsClustered: 0,
      duplicatesMerged: 0,
      skipped: true,
      analytics: emptyAnalytics,
    };
  }

  const docTokens = signalsToCluster.map((s) =>
    tokenizeForSimilarity(`${s.title} ${s.raw_content ?? ""}`)
  );
  const idf = computeIdf(docTokens);

  const embeddingTexts = signalsToCluster.map(
    (s) => `${s.title}\n${s.raw_content ?? ""}`
  );
  const embeddings = await fetchEmbeddings(embeddingTexts);
  const hasEmbeddings = embeddings.some((e) => e != null);
  const method: DuplicateDetectionAnalytics["method"] = hasEmbeddings
    ? "embedding_hybrid"
    : "keyword_tfidf";

  const features = buildSignalFeatures(signalsToCluster, idf, embeddings);
  const { clusters, analytics: partial } = clusterSignalsLocally(
    signalsToCluster,
    features
  );

  const supabase = createAdminServerClient();
  let eventsCreated = 0;
  let signalsClustered = 0;
  let duplicatesMerged = 0;
  let multiSource = 0;
  let singletons = 0;
  let confidenceSum = 0;

  for (const cluster of clusters) {
    const size = cluster.signals.length;
    signalsClustered += size;
    if (size > 1) {
      duplicatesMerged += size - 1;
      multiSource++;
    } else {
      singletons++;
    }

    for (const s of cluster.signals) {
      confidenceSum += scoreSourceConfidence(s);
    }

    const confidence = computeClusterConfidence({
      signals: cluster.signals,
      avgSimilarity: cluster.avgSimilarity,
      mergeReasons: cluster.mergeReasons,
    });

    const urgency = computeUrgencyScore(cluster.signals);
    const canonicalTitle = pickCanonicalTitle(cluster.signals);
    const isLive = shouldEnableLiveCoverage({
      sourceCount: size,
      urgencyScore: urgency,
      clusterConfidence: confidence.score,
      isBreaking: BREAKING_RE.test(
        cluster.signals.map((s) => s.title).join(" ")
      ),
    });

    const eventGeo = mergeGeoMetadata(
      ...cluster.signals.map((s) =>
        (s.geo_metadata as ReturnType<typeof tagGeoFromContent> | undefined) ??
          tagGeoFromContent({
            title: s.title,
            body: s.raw_content,
            region: s.region,
            category: s.category,
          })
      )
    );

    const row: NewsEventInsert = {
      tenant_id: getPipelineTenantId(),
      canonical_title: canonicalTitle,
      event_summary: buildEventSummary(cluster.signals),
      region: eventGeo.is_chhattisgarh
        ? "chhattisgarh"
        : inferCanonicalRegion(cluster.signals),
      category: inferCanonicalCategory(cluster.signals),
      urgency_score: urgency,
      source_count: size,
      signal_ids: cluster.signals.map((s) => s.id),
      clustering_metadata: asJsonObject({
        ...buildClusteringMetadata(cluster, method),
        cluster_confidence_report: confidence,
      } as Record<string, unknown>),
      cluster_confidence: confidence.score,
      is_live: isLive,
      coverage_status: "active",
      coverage_headline: isLive
        ? buildCoverageHeadline(
            canonicalTitle,
            cluster.signals[0]?.language
          )
        : null,
      coverage_slug: null,
    };

    const { data: inserted, error } = await supabase
      .from("news_events")
      .insert(row)
      .select("id")
      .single();

    if (!error && inserted && isLive) {
      const slug = buildCoverageSlug(canonicalTitle, inserted.id);
      await supabase
        .from("news_events")
        .update({ coverage_slug: slug })
        .eq("id", inserted.id);

      if (size > 0) {
        await supabase.from("coverage_updates").insert({
          event_id: inserted.id,
          update_type: size > 1 ? "development" : "source_wire",
          headline: cluster.signals[0].title,
          summary: cluster.signals[0].raw_content?.slice(0, 400),
          signal_ids: cluster.signals.map((s) => s.id),
          source_attribution: cluster.signals.map((s) => ({
            signal_id: s.id,
            source: s.source,
            provider: s.provider,
            article_url: s.article_url,
            published_at: s.published_at,
            confidence: scoreSourceConfidence(s),
          })),
          cluster_confidence: confidence.score,
          is_breaking: BREAKING_RE.test(cluster.signals[0].title),
          published_at:
            cluster.signals[0].published_at ?? new Date().toISOString(),
        });
      }
    }

    const insertError = error;
    if (!insertError) eventsCreated++;
    else {
      logClustering("event_insert_failed", {
        message: insertError.message,
        size,
      });
    }
  }

  const analytics: DuplicateDetectionAnalytics = {
    signalsFetched: signals.length,
    unprocessedCount: signalsToCluster.length,
    pairsCompared: partial.pairsCompared ?? 0,
    duplicatePairs: partial.duplicatePairs ?? 0,
    clustersFormed: clusters.length,
    singletonClusters: singletons,
    multiSourceClusters: multiSource,
    avgClusterSize: clusters.length
      ? signalsClustered / clusters.length
      : 0,
    avgSimilarity: partial.avgSimilarity ?? 0,
    method,
    sourceConfidenceAvg: signalsClustered
      ? confidenceSum / signalsClustered
      : 0,
  };

  logClustering("clustering_complete", analytics);

  return {
    eventsCreated,
    eventsUpdated,
    signalsProcessed: signals.length,
    signalsClustered,
    duplicatesMerged: duplicatesMerged + matches.length,
    skipped: false,
    analytics,
  };
}
