/**
 * Optimized editorial fact packs — top signals only, deduped headlines
 */

import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import type { SourceAttribution } from "@/lib/news/ai/editorial-guards";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

const TOP_SIGNALS = 5;
const EXCERPT_MAX = 320;

function normalizeHeadline(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeSignalsByTitle(signals: NewsSignalRow[]): NewsSignalRow[] {
  const seen = new Set<string>();
  const out: NewsSignalRow[] = [];
  for (const s of signals) {
    const key = normalizeHeadline(s.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function buildOptimizedFactPack(
  event: NewsEventRow,
  signals: NewsSignalRow[]
): {
  factPackText: string;
  sourceTexts: string[];
  attributions: SourceAttribution[];
  signalCountUsed: number;
  signalCountTotal: number;
} {
  const ranked = [...dedupeSignalsByTitle(signals)].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );

  const top = ranked.slice(0, TOP_SIGNALS);
  const remainder = ranked.slice(TOP_SIGNALS);

  const attributions: SourceAttribution[] = top.map((s) => ({
    signal_id: s.id,
    source: s.source,
    provider: s.provider,
    article_url: s.article_url,
    published_at: s.published_at,
    confidence: scoreSourceConfidence(s),
  }));

  const topFacts = top.map((s, i) => {
    const excerpt = (s.raw_content ?? s.title).trim().slice(0, EXCERPT_MAX);
    return `[${i + 1}] source=${s.source ?? s.provider} | confidence=${scoreSourceConfidence(s).toFixed(2)}\nTitle: ${s.title}\nExcerpt: ${excerpt}`;
  });

  const remainderSummary =
    remainder.length > 0
      ? `Additional ${remainder.length} sources (titles only): ${remainder.map((s) => s.title.trim()).join("; ")}`
      : "";

  const clusterSummary = (event.event_summary ?? "").trim().slice(0, 400);

  const factPackText = [
    `Event: ${event.canonical_title}`,
    `Category: ${event.category ?? "general"}`,
    `Region: ${event.region ?? "india"}`,
    clusterSummary ? `Cluster summary: ${clusterSummary}` : "",
    `Top sources used: ${top.length} of ${signals.length}`,
    "--- Primary facts (synthesize only from these) ---",
    ...topFacts,
    remainderSummary,
  ]
    .filter(Boolean)
    .join("\n\n");

  const sourceTexts = top.map((s) => `${s.title} ${s.raw_content ?? ""}`.trim());

  return {
    factPackText,
    sourceTexts,
    attributions,
    signalCountUsed: top.length,
    signalCountTotal: signals.length,
  };
}
