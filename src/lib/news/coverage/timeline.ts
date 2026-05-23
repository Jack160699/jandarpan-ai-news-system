/**
 * Unified timelines from signals, coverage updates, and editorial versions
 */

import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import type { CoverageUpdateRow } from "@/lib/types/newsroom";
import type { NewsSignalRow } from "@/lib/types/newsroom";

export type CoverageTimelineEntry = {
  id: string;
  label: string;
  detail: string;
  order: number;
  publishedAt: string | null;
  sourceLine?: string;
  isBreaking?: boolean;
  confidence?: number;
  type: "signal" | "update" | "editorial";
};

function formatSourceLine(signal: NewsSignalRow): string {
  const name = signal.source?.trim() || signal.provider;
  const conf = Math.round(scoreSourceConfidence(signal) * 100);
  return `${name} · ${conf}% confidence`;
}

export function buildCoverageTimeline(input: {
  signals: NewsSignalRow[];
  updates: CoverageUpdateRow[];
  editorialPublishedAt?: string | null;
  editorialHeadline?: string | null;
}): CoverageTimelineEntry[] {
  const entries: CoverageTimelineEntry[] = [];
  let order = 0;

  const sortedSignals = [...input.signals].sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  });

  for (const signal of sortedSignals) {
    entries.push({
      id: `sig-${signal.id}`,
      label: signal.published_at
        ? new Date(signal.published_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Wire report",
      detail: signal.title,
      order: order++,
      publishedAt: signal.published_at,
      sourceLine: formatSourceLine(signal),
      confidence: scoreSourceConfidence(signal),
      type: "signal",
    });
  }

  const sortedUpdates = [...input.updates].sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  for (const update of sortedUpdates) {
    entries.push({
      id: `upd-${update.id}`,
      label: update.is_breaking ? "Breaking update" : "Desk merge",
      detail: update.headline,
      order: order++,
      publishedAt: update.published_at,
      isBreaking: update.is_breaking,
      confidence: update.cluster_confidence ?? undefined,
      type: "update",
    });
  }

  if (input.editorialHeadline && input.editorialPublishedAt) {
    entries.push({
      id: "editorial-synthesis",
      label: "AI desk synthesis",
      detail: input.editorialHeadline,
      order: order++,
      publishedAt: input.editorialPublishedAt,
      type: "editorial",
    });
  }

  return entries.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
}

export function buildLiveUpdateBlocks(
  updates: CoverageUpdateRow[],
  signals: NewsSignalRow[]
): Array<{
  id: string;
  headline: string;
  summary: string | null;
  publishedAt: string;
  isBreaking: boolean;
  sources: Array<{ name: string; confidence: number; url?: string }>;
  clusterConfidence: number | null;
}> {
  const signalMap = new Map(signals.map((s) => [s.id, s]));
  const blocks: Array<{
    id: string;
    headline: string;
    summary: string | null;
    publishedAt: string;
    isBreaking: boolean;
    sources: Array<{ name: string; confidence: number; url?: string }>;
    clusterConfidence: number | null;
    sortKey: number;
  }> = [];

  for (const u of updates) {
    const attribution = (u.source_attribution ?? []) as Array<{
      source?: string | null;
      provider?: string;
      article_url?: string;
      confidence?: number;
    }>;

    const sources =
      attribution.length > 0
        ? attribution.map((a) => ({
            name: a.source?.trim() || a.provider || "Wire",
            confidence: a.confidence ?? 0.5,
            url: a.article_url,
          }))
        : u.signal_ids
            .map((id) => signalMap.get(id))
            .filter(Boolean)
            .map((s) => ({
              name: s!.source?.trim() || s!.provider,
              confidence: scoreSourceConfidence(s!),
              url: s!.article_url,
            }));

    blocks.push({
      id: u.id,
      headline: u.headline,
      summary: u.summary,
      publishedAt: u.published_at,
      isBreaking: u.is_breaking,
      sources,
      clusterConfidence: u.cluster_confidence,
      sortKey: new Date(u.published_at).getTime(),
    });
  }

  return blocks
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _s, ...rest }) => rest);
}
