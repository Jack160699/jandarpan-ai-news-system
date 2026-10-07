/**
 * Feed integrity view for the admin dashboard.
 *
 * Everything here is computed with the SAME canonical code readers' feeds use (selectFeedRows / resolveRowGeo / headline
 * quality), over the rows returned by public.admin_feed_integrity() (migration 099). The dashboard therefore cannot disagree with
 * the site: "eligible" means exactly what a reader would be shown.
 *
 * Three different freshness clocks are reported separately and never merged:
 *   ingestion   newest signal stored          (is news arriving?)
 *   editorial   newest article published      (is the newsroom publishing?)
 *   public feed newest article a reader sees   (what Latest/Live starts with, after the public gate)
 *
 * "Today" is the IST calendar day, like the rest of the ops snapshot.
 */

import { selectFeedRows, resolveRowGeo, type FeedRow } from "@/lib/feed/feed-selector";
import { checkPublicRow, type PublicRejectReason } from "@/lib/feed/public-eligibility";
import { classifyGeoScope, geographyClassOf, GEOGRAPHY_CLASSES, type GeographyClass } from "@/lib/news/geo/geo-scope";
import { auditHeadlines } from "@/lib/news/quality/headline-quality";
import { freshnessTone, ageMinutes, type PaceStatus } from "@/lib/admin-ops/health";
import type { Tone } from "@/lib/admin-ops/types";

export type FeedIntegrityRow = FeedRow & {
  event_id: string | null;
  language: string | null;
  created_at: string | null;
  has_en: boolean;
  has_hi: boolean;
};

export type FeedIntegrityRaw = {
  generated_at: string;
  newest_signal_created_at: string | null;
  newest_signal_published_at: string | null;
  rows: FeedIntegrityRow[];
};

export type ClassCounts = Record<GeographyClass, number>;

export type FeedIntegrityView = {
  generatedAt: string;
  freshness: {
    ingestion: { newestSignalAt: string | null; newestSignalPublishedAt: string | null; ageMinutes: number | null; tone: Tone };
    editorial: { latestPublishedAt: string | null; ageMinutes: number | null; tone: Tone };
    publicFeed: {
      newestEligibleAt: string | null;
      newestEligibleHeadline: string | null;
      ageMinutes: number | null;
      tone: Tone;
      eligiblePublicAll: number;
      eligibleLatest: number;
    };
    publishedLast1h: number;
    publishedLast6h: number;
    publishedLast24h: number;
    publishedLast48h: number;
    health24h: Tone;
    health48h: Tone;
    /** True when the newest eligible story is older than 24 h. */
    stale: boolean;
  };
  geography: {
    /** What readers can currently see, by the canonical geography class. */
    eligibleByClass: ClassCounts;
    /** Published today (IST), by class: kept separate on purpose -- never one combined "news count". */
    todayByClass: ClassCounts;
    chhattisgarhToday: number;
    districtSpecificToday: number;
    statewideToday: number;
    indiaToday: number;
    internationalToday: number;
    unknownToday: number;
    /** Approved but UNKNOWN geography, all time in the window: excluded from every public timeline. */
    approvedUnknown: number;
    /** Eligible rows whose geography came from text, not stored evidence (excluded from district pages). */
    withoutStoredScope: number;
    conflicting: Array<{ id: string; why: string }>;
    /** Stored district differs from the district the headline names: possible wrong-district content. */
    districtLeakageCandidates: Array<{ id: string; stored: string; headlineSuggests: string }>;
    /** What the Chhattisgarh-first Latest/Live feed drops, by scope (national / international / unknown that are NOT shown). */
    latestDroppedByScope: Record<string, number>;
  };
  language: {
    eligibleByLanguage: Record<string, number>;
    missingLanguage: number;
    /** Language field disagrees with the headline script. */
    conflicting: number;
    bilingual: { hiWithEn: number; hiTotal: number; enWithHi: number; enTotal: number; coveragePct: number | null };
    /** Events that have more than one separate eligible article row (cross-language representations as rows). */
    multiRepresentationEvents: number;
  };
  headlines: { generic: number; exactDuplicates: number; nearDuplicates: number; repetitiveOpenings: number };
  gate: { droppedByReason: Partial<Record<PublicRejectReason, number>>; pendingOrRejected: number };
};

const HOUR = 3_600_000;
const DEVANAGARI = /[ऀ-ॿ]/;
const IST_OFFSET_MS = 5.5 * HOUR;

/** Start of the current IST calendar day, as a UTC instant. */
export function istDayStart(now: Date): Date {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  const midnightShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(midnightShifted - IST_OFFSET_MS);
}

function emptyClassCounts(): ClassCounts {
  return Object.fromEntries(GEOGRAPHY_CLASSES.map((c) => [c, 0])) as ClassCounts;
}

function toneForHours(count24: number): Tone {
  return count24 === 0 ? "critical" : count24 < 5 ? "warning" : "healthy";
}

export function buildFeedIntegrity(raw: FeedIntegrityRaw, now: Date = new Date()): FeedIntegrityView {
  const rows = raw.rows ?? [];
  const nowMs = now.getTime();
  const dayStart = istDayStart(now).getTime();

  // Public gate diagnostics over ALL rows (so pending / rejected / out-of-window are accounted for, not hidden).
  const droppedByReason: Partial<Record<PublicRejectReason, number>> = {};
  for (const r of rows) {
    const c = checkPublicRow(r, now);
    if (!c.eligible) droppedByReason[c.reason] = (droppedByReason[c.reason] ?? 0) + 1;
  }
  const eligibleAll = selectFeedRows(rows, { feed: "public_all", order: "chronological", now });
  const latestFeed = selectFeedRows(rows, { feed: "cg_home", order: "chronological", now });
  const eligible = eligibleAll.rows;

  // Freshness.
  const newestEligible = eligible[0] ?? null;
  const publishedMs = (r: FeedIntegrityRow) => (r.published_at ? new Date(r.published_at).getTime() : NaN);
  const approved = rows.filter((r) => ["approved", "published", "live"].includes(String(r.editorial_status)) && Number.isFinite(publishedMs(r)));
  const latestPublished = approved.reduce<FeedIntegrityRow | null>((best, r) => (best === null || publishedMs(r) > publishedMs(best) ? r : best), null);
  const within = (hours: number) => approved.filter((r) => nowMs - publishedMs(r) <= hours * HOUR && publishedMs(r) <= nowMs + 2 * HOUR).length;
  const last24 = within(24);
  const last48 = within(48);
  const signalAge = ageMinutes(raw.newest_signal_created_at, nowMs);
  const editorialAge = ageMinutes(latestPublished?.published_at, nowMs);
  const publicAge = ageMinutes(newestEligible?.published_at, nowMs);

  // Geography.
  const eligibleByClass = emptyClassCounts();
  const todayByClass = emptyClassCounts();
  let withoutStoredScope = 0;
  const conflicting: Array<{ id: string; why: string }> = [];
  const leakage: Array<{ id: string; stored: string; headlineSuggests: string }> = [];
  for (const r of eligible) {
    const geo = resolveRowGeo(r);
    const cls = geographyClassOf(geo.scope);
    eligibleByClass[cls]++;
    if (r.published_at && new Date(r.published_at).getTime() >= dayStart) todayByClass[cls]++;
    if (geo.derived) withoutStoredScope++;
    const meta = (r.geo_metadata ?? {}) as Record<string, unknown>;
    if (!geo.derived && geo.scope === "DISTRICT_SPECIFIC" && !geo.districtSlug && geo.districts.length === 0) conflicting.push({ id: r.id, why: "DISTRICT_SPECIFIC without any district" });
    if (!geo.derived && !["DISTRICT_SPECIFIC", "STATEWIDE_CHHATTISGARH", "INDIA_RELEVANT_TO_CHHATTISGARH"].includes(geo.scope) && meta.is_chhattisgarh === true)
      conflicting.push({ id: r.id, why: `scope ${geo.scope} but is_chhattisgarh=true` });
    if (!geo.derived && geo.scope === "DISTRICT_SPECIFIC" && geo.districtSlug) {
      const fromText = classifyGeoScope({ title: r.headline, description: (r as { summary?: string | null }).summary ?? null });
      if (fromText.scope === "DISTRICT_SPECIFIC" && fromText.districtSlug && fromText.districtSlug !== geo.districtSlug && !geo.districts.includes(fromText.districtSlug))
        leakage.push({ id: r.id, stored: geo.districtSlug, headlineSuggests: fromText.districtSlug });
    }
  }
  const approvedUnknown = approved.filter((r) => geographyClassOf(resolveRowGeo(r).scope) === "unknown").length;

  // Language.
  const eligibleByLanguage: Record<string, number> = {};
  let missingLanguage = 0;
  let conflictingLanguage = 0;
  for (const r of eligible) {
    const l = r.language?.trim() || "";
    if (!l) missingLanguage++;
    const key = l || "missing";
    eligibleByLanguage[key] = (eligibleByLanguage[key] ?? 0) + 1;
    const dev = DEVANAGARI.test(r.headline);
    if ((l === "hi" && !dev) || (l === "en" && dev)) conflictingLanguage++;
  }
  const hi = eligible.filter((r) => r.language === "hi");
  const en = eligible.filter((r) => r.language === "en");
  const hiWithEn = hi.filter((r) => r.has_en).length;
  const enWithHi = en.filter((r) => r.has_hi).length;
  const pairs = hi.length + en.length;
  const byEvent = new Map<string, number>();
  for (const r of eligible) if (r.event_id) byEvent.set(r.event_id, (byEvent.get(r.event_id) ?? 0) + 1);

  const headlineAudit = auditHeadlines(eligible.map((r) => ({ id: r.id, headline: r.headline, eventId: r.event_id })));

  return {
    generatedAt: now.toISOString(),
    freshness: {
      ingestion: {
        newestSignalAt: raw.newest_signal_created_at,
        newestSignalPublishedAt: raw.newest_signal_published_at,
        ageMinutes: signalAge,
        tone: freshnessTone(signalAge),
      },
      editorial: { latestPublishedAt: latestPublished?.published_at ?? null, ageMinutes: editorialAge, tone: freshnessTone(editorialAge) },
      publicFeed: {
        newestEligibleAt: newestEligible?.published_at ?? null,
        newestEligibleHeadline: newestEligible?.headline ?? null,
        ageMinutes: publicAge,
        tone: freshnessTone(publicAge),
        eligiblePublicAll: eligible.length,
        eligibleLatest: latestFeed.rows.length,
      },
      publishedLast1h: within(1),
      publishedLast6h: within(6),
      publishedLast24h: last24,
      publishedLast48h: last48,
      health24h: toneForHours(last24),
      health48h: toneForHours(last48),
      stale: publicAge === null || publicAge > 24 * 60,
    },
    geography: {
      eligibleByClass,
      todayByClass,
      chhattisgarhToday: todayByClass.district + todayByClass.chhattisgarh_statewide,
      districtSpecificToday: todayByClass.district,
      statewideToday: todayByClass.chhattisgarh_statewide,
      indiaToday: todayByClass.india,
      internationalToday: todayByClass.international,
      unknownToday: todayByClass.unknown,
      approvedUnknown,
      withoutStoredScope,
      conflicting,
      districtLeakageCandidates: leakage,
      latestDroppedByScope: latestFeed.diagnostics.droppedByScope as Record<string, number>,
    },
    language: {
      eligibleByLanguage,
      missingLanguage,
      conflicting: conflictingLanguage,
      bilingual: {
        hiWithEn,
        hiTotal: hi.length,
        enWithHi,
        enTotal: en.length,
        coveragePct: pairs > 0 ? Math.round(((hiWithEn + enWithHi) / pairs) * 1000) / 10 : null,
      },
      multiRepresentationEvents: [...byEvent.values()].filter((n) => n > 1).length,
    },
    headlines: {
      generic: headlineAudit.generic.length,
      exactDuplicates: headlineAudit.exactDuplicates.length,
      nearDuplicates: headlineAudit.nearDuplicates.length,
      repetitiveOpenings: headlineAudit.repetitiveOpenings.length,
    },
    gate: { droppedByReason, pendingOrRejected: droppedByReason.not_public_status ?? 0 },
  };
}

/** Reused by the pace panel to avoid importing health.ts twice in consumers. */
export type { PaceStatus };
