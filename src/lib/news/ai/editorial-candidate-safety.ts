import type { NewsEventRow, NewsSignalRow } from "@/lib/types/newsroom";

export type EditorialFreshnessDecision = {
  decision: "fresh" | "follow_up" | "stale";
  reason: string;
  newestSourceAt: string | null;
  ageHours: number | null;
};

const MAX_CURRENT_SOURCE_AGE_HOURS = 36;
const CORRUPTED_ENTITY_RE =
  /कॉकरोच\s+जनता\s+पार्टी|cockroach\s+(public|people'?s)\s+party/i;
const MOJIBAKE_RE = /(?:Ã.|â€|ï¿½|�){2,}/;

function normalizedUrl(url: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizedTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeEditorialSignals(signals: NewsSignalRow[]): NewsSignalRow[] {
  const seen = new Set<string>();
  const output: NewsSignalRow[] = [];
  for (const signal of signals) {
    const url = normalizedUrl(signal.article_url);
    const title = normalizedTitle(signal.title);
    const titleKey = title ? `title:${title}` : "";
    if (!url && !titleKey) continue;
    if ((url && seen.has(url)) || (titleKey && seen.has(titleKey))) continue;
    if (url) seen.add(url);
    if (titleKey) seen.add(titleKey);
    output.push(signal);
  }
  return output;
}

export function findUnsafeSourceReason(signals: NewsSignalRow[]): string | null {
  for (const signal of signals) {
    const text = `${signal.title}\n${signal.raw_content ?? ""}`;
    if (CORRUPTED_ENTITY_RE.test(text)) return "corrupted_entity_in_source";
    if (MOJIBAKE_RE.test(text)) return "malformed_source_text";
  }
  return null;
}

export function assessEditorialFreshness(
  event: NewsEventRow,
  signals: NewsSignalRow[],
  nowMs = Date.now()
): EditorialFreshnessDecision {
  const timestamps = signals
    .map((signal) => Date.parse(signal.published_at ?? signal.created_at))
    .filter(Number.isFinite);
  const newest = timestamps.length ? Math.max(...timestamps) : Date.parse(event.created_at);
  if (!Number.isFinite(newest)) {
    return {
      decision: "stale",
      reason: "missing_valid_source_timestamp",
      newestSourceAt: null,
      ageHours: null,
    };
  }

  const ageHours = Math.max(0, (nowMs - newest) / 3_600_000);
  if (ageHours <= MAX_CURRENT_SOURCE_AGE_HOURS) {
    return {
      decision: "fresh",
      reason: "recent_source_evidence",
      newestSourceAt: new Date(newest).toISOString(),
      ageHours,
    };
  }

  return {
    decision: "stale",
    reason: event.is_live
      ? "live_event_without_recent_source_evidence"
      : "source_evidence_older_than_36h",
    newestSourceAt: new Date(newest).toISOString(),
    ageHours,
  };
}

export { MAX_CURRENT_SOURCE_AGE_HOURS };
