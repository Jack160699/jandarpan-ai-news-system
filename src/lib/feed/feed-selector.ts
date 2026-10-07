/**
 * Feed selector — the single place that decides WHICH stories a feed may show and in
 * WHAT order.
 *
 *  - Geography: a story's scope (DISTRICT_SPECIFIC … UNKNOWN) gates every feed.
 *    District feeds admit only stories with textual evidence for that district; they
 *    never fall back to statewide / national / unknown copy.
 *  - Ordering: `chronological` is strict published_at desc (Latest, Live);
 *    `fresh_ranked` orders by freshness class first, then score within a class, so an
 *    older story can never outrank a newer class on score alone (Home).
 *  - Legacy rows without a stored scope are classified from their text at read time,
 *    deterministically and memoised -- for COARSE feeds only. A district feed never uses a
 *    text-derived district: only a stored, evidence-based DISTRICT_SPECIFIC scope qualifies.
 *  - Every feed first passes the canonical public gate (public-eligibility.ts): public status,
 *    30-day window, slug, fit headline, de-duplication.
 */

import {
  belongsToDistrictFeed,
  capIndiaRelevantShare,
  classifyGeoScope,
  isScopeAllowedInFeed,
  readStoredGeoScope,
  type FeedKind,
  type GeoScope,
  type GeoScopeResult,
} from "@/lib/news/geo/geo-scope";
import {
  checkPublicRow,
  dedupeRowsNewestWins,
  type PublicRejectReason,
} from "@/lib/feed/public-eligibility";
import {
  ageMs,
  classifyFreshness,
  comparePublishedDesc,
  freshnessRank,
  type FreshnessClass,
} from "@/lib/feed/freshness";

/** Minimal shape needed from a generated_articles row. */
export type FeedRow = {
  id: string;
  slug?: string;
  headline: string;
  summary?: string | null;
  published_at: string | null;
  created_at?: string | null;
  tags?: string[] | null;
  editorial_status?: string | null;
  workflow_status?: string | null;
  geo_metadata?: unknown;
  editorial_metadata?: unknown;
};

export type FeedOrder = "chronological" | "fresh_ranked";

export type FeedSelectionOptions<T extends FeedRow> = {
  feed: FeedKind;
  /** Required for feed === "district". */
  districtSlug?: string;
  order?: FeedOrder;
  now?: Date;
  limit?: number;
  /** Score used inside a freshness class for `fresh_ranked`. Higher first. */
  score?: (row: T) => number;
  /** Max share of INDIA_RELEVANT_TO_CHHATTISGARH in a cg_home list (default 0.2). */
  maxIndiaRelevantShare?: number;
  /** Drop anything older than this many hours (Live uses e.g. 48). */
  maxAgeHours?: number;
  /**
   * Apply the canonical public gate (status / 30-day window / slug / headline / de-dup). Default true.
   * Only admin and audit tooling may turn it off.
   */
  publicGate?: boolean;
};

export type FeedSelectionDiagnostics = {
  input: number;
  /** Rows removed by the public gate, by reason. */
  droppedByGate: Partial<Record<PublicRejectReason | "duplicate", number>>;
  afterGate: number;
  afterAge: number;
  afterScope: number;
  returned: number;
  droppedByScope: Partial<Record<GeoScope, number>>;
  scopeCounts: Partial<Record<GeoScope, number>>;
  newestPublishedAt: string | null;
  newestAgeMinutes: number | null;
  freshnessCounts: Partial<Record<FreshnessClass, number>>;
  /** True when scope had to be derived from text (legacy rows). */
  derivedScopeCount: number;
  /** Rows kept out of a district feed only because their geography was text-derived, not stored evidence. */
  droppedDerivedForDistrict: number;
};

export type FeedSelection<T extends FeedRow> = {
  rows: T[];
  diagnostics: FeedSelectionDiagnostics;
};

type ResolvedRowGeo = Pick<GeoScopeResult, "scope" | "districtSlug" | "districts"> & {
  derived: boolean;
};

const derivedCache = new Map<string, ResolvedRowGeo>();
const CACHE_MAX = 5_000;

function storedDistricts(meta: Record<string, unknown> | null): string[] {
  const d = meta?.districts;
  return Array.isArray(d) ? d.filter((x): x is string => typeof x === "string") : [];
}

/** Scope for a row: stored (evidence-based, written at publish) or derived from text. */
export function resolveRowGeo(row: FeedRow): ResolvedRowGeo {
  const meta =
    row.geo_metadata && typeof row.geo_metadata === "object" && !Array.isArray(row.geo_metadata)
      ? (row.geo_metadata as Record<string, unknown>)
      : null;
  const stored = readStoredGeoScope(meta);
  if (stored) {
    const primary = typeof meta?.primary_district === "string" ? (meta.primary_district as string) : null;
    return { scope: stored, districtSlug: primary, districts: storedDistricts(meta), derived: false };
  }

  const key = `${row.id}|${row.headline}`;
  const hit = derivedCache.get(key);
  if (hit) return hit;
  const derived = classifyGeoScope({
    title: row.headline,
    description: row.summary ?? undefined,
  });
  const resolved: ResolvedRowGeo = {
    scope: derived.scope,
    districtSlug: derived.districtSlug,
    districts: derived.districts,
    derived: true,
  };
  if (derivedCache.size >= CACHE_MAX) derivedCache.clear();
  derivedCache.set(key, resolved);
  return resolved;
}

export function selectFeedRows<T extends FeedRow>(
  rows: readonly T[],
  options: FeedSelectionOptions<T>
): FeedSelection<T> {
  const now = options.now ?? new Date();
  const order: FeedOrder = options.order ?? "chronological";
  const diag: FeedSelectionDiagnostics = {
    input: rows.length,
    droppedByGate: {},
    afterGate: 0,
    afterAge: 0,
    afterScope: 0,
    returned: 0,
    droppedByScope: {},
    scopeCounts: {},
    newestPublishedAt: null,
    newestAgeMinutes: null,
    freshnessCounts: {},
    derivedScopeCount: 0,
    droppedDerivedForDistrict: 0,
  };

  // 0. Canonical public gate: status, 30-day window, slug, headline; then de-dup (newest representation wins).
  let gated: readonly T[] = rows;
  if (options.publicGate !== false) {
    const passed: T[] = [];
    for (const r of rows) {
      const check = checkPublicRow(r, now);
      if (check.eligible) passed.push(r);
      else diag.droppedByGate[check.reason] = (diag.droppedByGate[check.reason] ?? 0) + 1;
    }
    const unique = dedupeRowsNewestWins([...passed].sort(comparePublishedDesc));
    const dup = passed.length - unique.length;
    if (dup > 0) diag.droppedByGate.duplicate = dup;
    gated = unique;
  }
  diag.afterGate = gated.length;

  // 1. Age window.
  const maxAgeMs = options.maxAgeHours ? options.maxAgeHours * 3_600_000 : null;
  const aged = gated.filter((r) => {
    if (maxAgeMs === null) return true;
    const a = ageMs(r.published_at, now);
    return a !== null && a <= maxAgeMs;
  });
  diag.afterAge = aged.length;

  // 2. Geography policy.
  const scoped: Array<{ row: T; scope: GeoScope }> = [];
  for (const row of aged) {
    const geo = resolveRowGeo(row);
    if (geo.derived) diag.derivedScopeCount++;
    diag.scopeCounts[geo.scope] = (diag.scopeCounts[geo.scope] ?? 0) + 1;

    let allowed: boolean;
    if (options.feed === "district") {
      if (!options.districtSlug) throw new Error("districtSlug is required for the district feed");
      // A district page admits only a STORED, evidence-based district scope. A district guessed from the headline of a
      // legacy row (no stored scope) is never proof, so it cannot enter a district feed.
      if (geo.derived) {
        allowed = false;
        if (geo.scope === "DISTRICT_SPECIFIC") diag.droppedDerivedForDistrict++;
      } else {
        allowed = belongsToDistrictFeed(geo, options.districtSlug);
      }
    } else {
      allowed = isScopeAllowedInFeed(geo.scope, options.feed);
    }
    if (allowed) scoped.push({ row, scope: geo.scope });
    else diag.droppedByScope[geo.scope] = (diag.droppedByScope[geo.scope] ?? 0) + 1;
  }
  diag.afterScope = scoped.length;

  // 3. Ordering.
  let ordered: Array<{ row: T; scope: GeoScope }>;
  if (order === "chronological") {
    ordered = [...scoped].sort((a, b) => comparePublishedDesc(a.row, b.row));
  } else {
    const score = options.score ?? (() => 0);
    ordered = [...scoped].sort((a, b) => {
      const ca = freshnessRank(classifyFreshness(a.row.published_at, now));
      const cb = freshnessRank(classifyFreshness(b.row.published_at, now));
      if (ca !== cb) return ca - cb; // fresher class always first
      const sa = score(a.row);
      const sb = score(b.row);
      if (sb !== sa) return sb - sa;
      return comparePublishedDesc(a.row, b.row);
    });
  }

  // 4. Controlled national spill-over in the Chhattisgarh-first list.
  if (options.feed === "cg_home") {
    ordered = capIndiaRelevantShare(ordered, options.maxIndiaRelevantShare ?? 0.2);
  }

  const limited = options.limit ? ordered.slice(0, options.limit) : ordered;
  const out = limited.map((x) => x.row);

  diag.returned = out.length;
  for (const r of out) {
    const cls = classifyFreshness(r.published_at, now);
    diag.freshnessCounts[cls] = (diag.freshnessCounts[cls] ?? 0) + 1;
  }
  const newest = [...out].sort(comparePublishedDesc)[0];
  if (newest?.published_at) {
    diag.newestPublishedAt = newest.published_at;
    const a = ageMs(newest.published_at, now);
    diag.newestAgeMinutes = a === null ? null : Math.round(a / 60_000);
  }

  return { rows: out, diagnostics: diag };
}
