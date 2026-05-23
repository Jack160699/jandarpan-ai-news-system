/**
 * Local trend detection — district and topic velocity from article pools
 */

import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { logLocalTrendSignals } from "@/lib/regional/analytics";
import { getPrioritizedDistricts } from "@/lib/regional/districts";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type LocalTrendSignal = {
  key: string;
  type: "district" | "topic";
  label: string;
  count: number;
  velocity: number;
  sampleHeadlines: string[];
};

const TOPIC_BUCKETS: Array<{ key: string; label: string; re: RegExp }> = [
  { key: "politics", label: "Politics", re: /election|mla|mp\b|cabinet|विधान/i },
  { key: "crime", label: "Crime & law", re: /police|murder|arrest|court|गिरफ्तार/i },
  { key: "weather", label: "Weather", re: /rain|flood|storm|बारिश|बाढ़/i },
  { key: "health", label: "Health", re: /hospital|disease|health|स्वास्थ्य/i },
  { key: "infrastructure", label: "Infrastructure", re: /road|bridge|power|बिजली|सड़क/i },
];

function hoursSince(iso: string | null): number {
  if (!iso) return 72;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function detectLocalTrends(
  rows: GeneratedArticleRow[],
  options?: { maxSignals?: number; windowHours?: number }
): LocalTrendSignal[] {
  const maxSignals = options?.maxSignals ?? 12;
  const windowHours = options?.windowHours ?? 48;

  const districtCounts = new Map<
    string,
    { count: number; fresh: number; headlines: string[] }
  >();
  const topicCounts = new Map<
    string,
    { label: string; count: number; fresh: number; headlines: string[] }
  >();

  for (const row of rows) {
    const hours = hoursSince(row.published_at ?? row.created_at);
    if (hours > windowHours) continue;

    const geo = geoFromRecord(row);
    if (!geo.is_chhattisgarh && geo.districts.length === 0) continue;

    const freshWeight = hours <= 6 ? 2 : hours <= 24 ? 1.5 : 1;

    for (const slug of geo.districts.length ? geo.districts : ["statewide"]) {
      const entry = districtCounts.get(slug) ?? {
        count: 0,
        fresh: 0,
        headlines: [],
      };
      entry.count += 1;
      entry.fresh += freshWeight;
      if (entry.headlines.length < 3) entry.headlines.push(row.headline.slice(0, 80));
      districtCounts.set(slug, entry);
    }

    const blob = `${row.headline} ${row.summary ?? ""}`;
    for (const bucket of TOPIC_BUCKETS) {
      if (!bucket.re.test(blob)) continue;
      const entry = topicCounts.get(bucket.key) ?? {
        label: bucket.label,
        count: 0,
        fresh: 0,
        headlines: [],
      };
      entry.count += 1;
      entry.fresh += freshWeight;
      if (entry.headlines.length < 2) entry.headlines.push(row.headline.slice(0, 60));
      topicCounts.set(bucket.key, entry);
    }
  }

  const districtSignals: LocalTrendSignal[] = [...districtCounts.entries()]
    .map(([slug, data]) => ({
      key: slug,
      type: "district" as const,
      label: slug === "statewide" ? "Chhattisgarh" : slug,
      count: data.count,
      velocity: Math.round(data.fresh * 10) / 10,
      sampleHeadlines: data.headlines,
    }))
    .sort((a, b) => b.velocity - a.velocity);

  const topicSignals: LocalTrendSignal[] = [...topicCounts.entries()]
    .map(([key, data]) => ({
      key,
      type: "topic" as const,
      label: data.label,
      count: data.count,
      velocity: Math.round(data.fresh * 10) / 10,
      sampleHeadlines: data.headlines,
    }))
    .sort((a, b) => b.velocity - a.velocity);

  const prioritized = new Set(getPrioritizedDistricts().map((d) => d.slug));
  districtSignals.sort((a, b) => {
    const aP = prioritized.has(a.key) ? 1 : 0;
    const bP = prioritized.has(b.key) ? 1 : 0;
    if (aP !== bP) return bP - aP;
    return b.velocity - a.velocity;
  });

  const combined = [...districtSignals, ...topicSignals].slice(0, maxSignals);

  logLocalTrendSignals({
    poolSize: rows.length,
    windowHours,
    signalCount: combined.length,
    topDistrict: districtSignals[0]?.key ?? null,
    topTopic: topicSignals[0]?.key ?? null,
    signals: combined.slice(0, 6).map((s) => ({
      key: s.key,
      type: s.type,
      velocity: s.velocity,
      count: s.count,
    })),
  });

  return combined;
}
