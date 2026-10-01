/**
 * Freshness classes for news ordering and diagnostics.
 *
 * published_at (the story's publication time) is the ONLY freshness field.
 * created_at is a row-insert timestamp, not the news event time.
 */

export const FRESHNESS_CLASSES = [
  "lt_1h",
  "h1_3",
  "h3_6",
  "h6_12",
  "h12_24",
  "d1_2",
  "older",
] as const;
export type FreshnessClass = (typeof FRESHNESS_CLASSES)[number];

const HOUR = 3_600_000;

/** Class upper bounds in ms, in order. */
const BOUNDS: Array<[FreshnessClass, number]> = [
  ["lt_1h", 1 * HOUR],
  ["h1_3", 3 * HOUR],
  ["h3_6", 6 * HOUR],
  ["h6_12", 12 * HOUR],
  ["h12_24", 24 * HOUR],
  ["d1_2", 48 * HOUR],
];

export const FRESHNESS_LABELS: Record<FreshnessClass, string> = {
  lt_1h: "< 1 hour",
  h1_3: "1–3 hours",
  h3_6: "3–6 hours",
  h6_12: "6–12 hours",
  h12_24: "12–24 hours",
  d1_2: "1–2 days",
  older: "Older",
};

export function publishedTimeMs(
  publishedAt: string | null | undefined,
  fallbackCreatedAt?: string | null
): number | null {
  const v = publishedAt ?? fallbackCreatedAt ?? null;
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

export function ageMs(
  publishedAt: string | null | undefined,
  now: Date | number = Date.now()
): number | null {
  const t = publishedTimeMs(publishedAt);
  if (t === null) return null;
  const n = typeof now === "number" ? now : now.getTime();
  // A timestamp slightly in the future (clock skew, source TZ error) counts as "just now".
  return Math.max(0, n - t);
}

export function classifyFreshness(
  publishedAt: string | null | undefined,
  now: Date | number = Date.now()
): FreshnessClass {
  const age = ageMs(publishedAt, now);
  if (age === null) return "older";
  for (const [cls, bound] of BOUNDS) {
    if (age < bound) return cls;
  }
  return "older";
}

export function freshnessRank(cls: FreshnessClass): number {
  return FRESHNESS_CLASSES.indexOf(cls);
}

/** Count rows per freshness class (admin/diagnostics). */
export function freshnessHistogram(
  rows: ReadonlyArray<{ published_at: string | null }>,
  now: Date | number = Date.now()
): Record<FreshnessClass, number> {
  const out = Object.fromEntries(FRESHNESS_CLASSES.map((c) => [c, 0])) as Record<FreshnessClass, number>;
  for (const r of rows) out[classifyFreshness(r.published_at, now)]++;
  return out;
}

/** Strict newest-first comparator on published_at (ties broken by id for stable output). */
export function comparePublishedDesc(
  a: { published_at: string | null; created_at?: string | null; id?: string },
  b: { published_at: string | null; created_at?: string | null; id?: string }
): number {
  const ta = publishedTimeMs(a.published_at) ?? Number.NEGATIVE_INFINITY;
  const tb = publishedTimeMs(b.published_at) ?? Number.NEGATIVE_INFINITY;
  if (tb !== ta) return tb - ta;
  return String(b.id ?? "").localeCompare(String(a.id ?? ""));
}
