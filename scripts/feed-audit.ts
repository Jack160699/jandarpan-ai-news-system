/**
 * Read-only feed / geography / language / headline audit of PRODUCTION generated_articles.
 *
 *   npx tsx scripts/feed-audit.ts            prints the report as JSON
 *
 * It runs the SAME canonical code the readers' feeds run (selectFeedRows, resolveRowGeo, headline quality), against the rows
 * as stored. It never writes, never edits history, and reports problems as they are -- no number is adjusted to look better.
 * Uses the direct-SQL path, so it works while REST is HTTP 402.
 */
import { querySql } from "./lib/supabase-cli";
import { selectFeedRows, resolveRowGeo, type FeedRow } from "../src/lib/feed/feed-selector";
import { checkPublicRow } from "../src/lib/feed/public-eligibility";
import { classifyGeoScope, geographyClassOf, GEOGRAPHY_CLASSES } from "../src/lib/news/geo/geo-scope";
import { auditHeadlines } from "../src/lib/news/quality/headline-quality";
import { getCanonicalReaderCutoffIso } from "../src/lib/news/canonical-window";

type Row = FeedRow & {
  event_id: string | null;
  language: string | null;
  created_at: string | null;
  summary: string | null;
  has_en: boolean;
  has_hi: boolean;
};

const DEVANAGARI = /[ऀ-ॿ]/;
const now = new Date();

const rows = querySql<Record<string, unknown>>(`
  select id::text, event_id::text, slug, headline, summary, language, published_at, created_at, editorial_status, workflow_status,
         geo_metadata, (translations ? 'en') as has_en, (translations ? 'hi') as has_hi
    from generated_articles order by published_at desc nulls last`) as unknown as Row[];

const published = rows.filter((r) => ["approved", "published", "live"].includes(String(r.editorial_status)));
const cutoff = getCanonicalReaderCutoffIso(now);

// ---- Feed audit ----
const withTs = published.filter((r) => r.published_at);
const inWindow = withTs.filter((r) => String(r.published_at) >= cutoff);
const gateReasons: Record<string, number> = {};
for (const r of rows) {
  const c = checkPublicRow(r, now);
  if (!c.eligible) gateReasons[c.reason] = (gateReasons[c.reason] ?? 0) + 1;
}
const eligible = selectFeedRows(rows, { feed: "public_all", order: "chronological", now });
const cgHome = selectFeedRows(rows, { feed: "cg_home", order: "chronological", now });
const timestampAnomalies = {
  approved_without_published_at: published.filter((r) => !r.published_at).length,
  published_at_in_future: published.filter((r) => r.published_at && new Date(String(r.published_at)).getTime() > now.getTime()).length,
  published_before_created: published.filter((r) => r.published_at && r.created_at && new Date(String(r.published_at)) < new Date(String(r.created_at))).length,
};

// ---- Geography audit ----
const geoClassCounts: Record<string, number> = Object.fromEntries(GEOGRAPHY_CLASSES.map((c) => [c, 0]));
const scopeCounts: Record<string, number> = {};
let legacyWithoutStoredScope = 0;
const conflicting: Array<{ id: string; why: string }> = [];
const leakageCandidates: Array<{ id: string; stored: string; headlineSuggests: string }> = [];
for (const r of eligible.rows) {
  const geo = resolveRowGeo(r);
  geoClassCounts[geographyClassOf(geo.scope)]++;
  scopeCounts[geo.scope] = (scopeCounts[geo.scope] ?? 0) + 1;
  if (geo.derived) legacyWithoutStoredScope++;
  const meta = (r.geo_metadata ?? {}) as Record<string, unknown>;
  if (!geo.derived && geo.scope === "DISTRICT_SPECIFIC" && !geo.districtSlug && geo.districts.length === 0) conflicting.push({ id: r.id, why: "DISTRICT_SPECIFIC without any district" });
  if (!geo.derived && geo.scope !== "DISTRICT_SPECIFIC" && geo.scope !== "STATEWIDE_CHHATTISGARH" && meta.is_chhattisgarh === true && geo.scope !== "INDIA_RELEVANT_TO_CHHATTISGARH")
    conflicting.push({ id: r.id, why: `scope ${geo.scope} but is_chhattisgarh=true` });
  if (!geo.derived && geo.scope === "DISTRICT_SPECIFIC") {
    const text = classifyGeoScope({ title: r.headline, description: r.summary });
    if (text.scope === "DISTRICT_SPECIFIC" && text.districtSlug && geo.districtSlug && text.districtSlug !== geo.districtSlug && !geo.districts.includes(text.districtSlug))
      leakageCandidates.push({ id: r.id, stored: geo.districtSlug, headlineSuggests: text.districtSlug });
  }
}
const approvedUnknown = published.filter((r) => geographyClassOf(resolveRowGeo(r).scope) === "unknown").length;

// ---- Language audit ----
const langCounts: Record<string, number> = {};
const scriptMismatch: string[] = [];
for (const r of eligible.rows) {
  const l = r.language ?? "missing";
  langCounts[l] = (langCounts[l] ?? 0) + 1;
  const dev = DEVANAGARI.test(r.headline);
  if ((r.language === "hi" && !dev) || (r.language === "en" && dev)) scriptMismatch.push(r.id);
}
const byEvent = new Map<string, Row[]>();
for (const r of eligible.rows) if (r.event_id) byEvent.set(r.event_id, [...(byEvent.get(r.event_id) ?? []), r]);
const multiRepresentationEvents = [...byEvent.values()].filter((g) => g.length > 1).length;
const bilingual = {
  hi_rows_with_en_translation: eligible.rows.filter((r) => r.language === "hi" && r.has_en).length,
  hi_rows_total: eligible.rows.filter((r) => r.language === "hi").length,
  en_rows_with_hi_translation: eligible.rows.filter((r) => r.language === "en" && r.has_hi).length,
  en_rows_total: eligible.rows.filter((r) => r.language === "en").length,
};

// ---- Headline audit ----
const headlineReport = auditHeadlines(eligible.rows.map((r) => ({ id: r.id, headline: r.headline, eventId: r.event_id })));
const allPublishedHeadlineReport = auditHeadlines(published.map((r) => ({ id: r.id, headline: r.headline, eventId: r.event_id })));

const report = {
  generatedAt: now.toISOString(),
  feed: {
    rows_total: rows.length,
    approved_or_published: published.length,
    with_published_at: withTs.length,
    within_30_days: inWindow.length,
    older_than_30_days: withTs.length - inWindow.length,
    eligible_public_all: eligible.rows.length,
    eligible_cg_home_latest: cgHome.rows.length,
    dropped_by_gate_reason: gateReasons,
    latest_eligible: eligible.rows[0] ? { id: eligible.rows[0].id, published_at: eligible.rows[0].published_at, headline: eligible.rows[0].headline } : null,
    oldest_eligible_published_at: eligible.rows[eligible.rows.length - 1]?.published_at ?? null,
    timestamp_anomalies: timestampAnomalies,
  },
  geography: {
    eligible_by_class: geoClassCounts,
    eligible_by_scope: scopeCounts,
    approved_with_unknown_geography_all_time: approvedUnknown,
    eligible_rows_without_stored_scope_text_derived_excluded_from_district_pages: legacyWithoutStoredScope,
    conflicting_or_malformed: conflicting,
    district_leakage_candidates_stored_district_differs_from_headline: leakageCandidates,
    cg_home_dropped_by_scope: cgHome.diagnostics.droppedByScope,
  },
  language: {
    eligible_by_language_field: langCounts,
    language_vs_headline_script_mismatch: scriptMismatch,
    events_with_more_than_one_eligible_representation: multiRepresentationEvents,
    bilingual_translation_coverage: bilingual,
  },
  headlines: {
    eligible: {
      total: headlineReport.total,
      generic: headlineReport.generic.map((g) => g.headline),
      exact_duplicates: headlineReport.exactDuplicates,
      near_duplicates: headlineReport.nearDuplicates.slice(0, 20),
      repetitive_openings: headlineReport.repetitiveOpenings.slice(0, 10),
    },
    all_published_history: {
      total: allPublishedHeadlineReport.total,
      generic_count: allPublishedHeadlineReport.generic.length,
      exact_duplicate_groups: allPublishedHeadlineReport.exactDuplicates.length,
      near_duplicate_pairs: allPublishedHeadlineReport.nearDuplicates.length,
    },
  },
};

console.log(JSON.stringify(report, null, 2));
