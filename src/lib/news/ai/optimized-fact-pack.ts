/**
 * Optimized editorial fact packs — richer excerpts for complete reports
 */

import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import type { SourceAttribution } from "@/lib/news/ai/editorial-guards";
import type { ArticleType } from "@/lib/news/ai/article-type";
import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

const TOP_SIGNALS = 6;

/** Excerpt length by article type — long enough for synthesis, bounded for cost */
const EXCERPT_MAX_BY_TYPE: Record<ArticleType, number> = {
  breaking_alert: 600,
  short_update: 900,
  standard_report: 1400,
  explainer: 1800,
  developing_story: 1200,
  analysis: 1800,
  service_information: 1000,
  live_continuing: 1200,
};

const DEFAULT_EXCERPT_MAX = 1400;
const CLUSTER_SUMMARY_MAX = 800;

function normalizeHeadline(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeSignalsByTitle(signals: NewsSignalRow[]): NewsSignalRow[] {
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

function excerptForSignal(raw: string, max: number): string {
  const text = raw.trim();
  if (text.length <= max) return text;
  // Prefer cutting at sentence boundary near the limit
  const slice = text.slice(0, max);
  const breakAt = Math.max(
    slice.lastIndexOf("।"),
    slice.lastIndexOf("."),
    slice.lastIndexOf("\n")
  );
  if (breakAt > max * 0.6) return slice.slice(0, breakAt + 1).trim();
  return `${slice.trim()}…`;
}

export function resolveFactPackExcerptMax(articleType?: ArticleType | null): number {
  if (articleType && articleType in EXCERPT_MAX_BY_TYPE) {
    return EXCERPT_MAX_BY_TYPE[articleType];
  }
  return DEFAULT_EXCERPT_MAX;
}

export function buildOptimizedFactPack(
  event: NewsEventRow,
  signals: NewsSignalRow[],
  options?: { articleType?: ArticleType | null; topSignals?: number }
): {
  factPackText: string;
  sourceTexts: string[];
  attributions: SourceAttribution[];
  signalCountUsed: number;
  signalCountTotal: number;
  excerptMax: number;
} {
  const ranked = [...dedupeSignalsByTitle(signals)].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );

  const topN = options?.topSignals ?? TOP_SIGNALS;
  const excerptMax = resolveFactPackExcerptMax(options?.articleType);
  const top = ranked.slice(0, topN);
  const remainder = ranked.slice(topN);

  const attributions: SourceAttribution[] = top.map((s) => ({
    signal_id: s.id,
    source: s.source,
    provider: s.provider,
    article_url: s.article_url,
    published_at: s.published_at,
    confidence: scoreSourceConfidence(s),
  }));

  const topFacts = top.map((s, i) => {
    const excerpt = excerptForSignal(s.raw_content ?? s.title, excerptMax);
    return `[${i + 1}] source=${s.source ?? s.provider} | confidence=${scoreSourceConfidence(s).toFixed(2)}\nTitle: ${s.title}\nExcerpt: ${excerpt}`;
  });

  const remainderSummary =
    remainder.length > 0
      ? `Additional ${remainder.length} sources (titles only): ${remainder.map((s) => s.title.trim()).join("; ")}`
      : "";

  const clusterSummary = (event.event_summary ?? "").trim().slice(0, CLUSTER_SUMMARY_MAX);

  const factPackText = [
    `Event: ${event.canonical_title}`,
    `Category: ${event.category ?? "general"}`,
    `Region: ${event.region ?? "india"}`,
    options?.articleType ? `Assigned article type: ${options.articleType}` : "",
    clusterSummary ? `Cluster summary: ${clusterSummary}` : "",
    `Top sources used: ${top.length} of ${signals.length}`,
    "--- Primary facts (synthesize only from these; do not invent beyond this pack) ---",
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
    excerptMax,
  };
}
