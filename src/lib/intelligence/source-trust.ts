/**
 * AI source trust engine — RSS health + attribution confidence
 */

import type { SourceTrustScore } from "@/lib/intelligence/types";
import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";

type HealthRow = {
  source_id: string;
  failure_count?: number;
  consecutive_failures?: number;
  disabled_until?: string | null;
  last_success?: string | null;
};

type AttributionRow = {
  source: string;
  provider: string;
  confidence: number;
};

export function buildSourceTrustEngine(input: {
  sourceHealth: HealthRow[];
  attributions: AttributionRow[];
}): SourceTrustScore[] {
  const healthMap = new Map(input.sourceHealth.map((h) => [h.source_id, h]));
  const attrMap = new Map<
    string,
    { confidenceSum: number; count: number; provider: string; name: string }
  >();

  for (const a of input.attributions) {
    const key = `${a.source ?? "unknown"}|${a.provider}`;
    const prev = attrMap.get(key) ?? {
      confidenceSum: 0,
      count: 0,
      provider: a.provider,
      name: a.source ?? "unknown",
    };
    attrMap.set(key, {
      ...prev,
      confidenceSum: prev.confidenceSum + (a.confidence ?? 0.5),
      count: prev.count + 1,
    });
  }

  const scores: SourceTrustScore[] = [];

  for (const rss of RSS_SOURCES) {
    const health = healthMap.get(rss.id);
    const attr = [...attrMap.entries()].find(([k]) => k.startsWith(`${rss.name}|`) || k.includes(rss.id));
    const attrData = attr?.[1];

    const failures = health?.consecutive_failures ?? health?.failure_count ?? 0;
    const disabled =
      health?.disabled_until &&
      new Date(health.disabled_until).getTime() > Date.now();

    let trust = 0.72;
    // RSS catalog uses `publisher | aggregator | scraped` tiers.
    if (rss.tier === "publisher") trust += 0.12;
    if (rss.tier === "aggregator") trust += 0.04;
    if (failures >= 5) trust -= 0.25;
    else if (failures >= 2) trust -= 0.1;
    if (disabled) trust -= 0.35;
    if (!health?.last_success) trust -= 0.15;

    const avgConf = attrData?.count
      ? attrData.confidenceSum / attrData.count
      : 0.55;
    trust = trust * 0.55 + avgConf * 0.45;
    trust = Math.max(0, Math.min(1, Math.round(trust * 1000) / 1000));

    const tier: SourceTrustScore["tier"] =
      trust >= 0.78 ? "trusted" : trust >= 0.55 ? "standard" : trust >= 0.35 ? "watch" : "untrusted";

    scores.push({
      sourceId: rss.id,
      sourceName: rss.name,
      provider: attrData?.provider ?? rss.id,
      trustScore: trust,
      tier,
      articleCount: attrData?.count ?? 0,
      failureRate: Math.min(1, failures / 10),
    });
  }

  return scores.sort((a, b) => b.trustScore - a.trustScore);
}

export function aggregateArticleTrust(
  attributions: AttributionRow[],
  sourceTrust: SourceTrustScore[]
): number {
  if (!attributions.length) return 0.5;
  const trustMap = new Map(
    sourceTrust.map((s) => [`${s.sourceName}|${s.provider}`, s.trustScore])
  );
  let sum = 0;
  for (const a of attributions) {
    const key = `${a.source ?? "unknown"}|${a.provider}`;
    sum += trustMap.get(key) ?? a.confidence ?? 0.5;
  }
  return Math.round((sum / attributions.length) * 1000) / 1000;
}
