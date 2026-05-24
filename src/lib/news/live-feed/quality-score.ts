/**
 * Feed quality scoring — freshness, images, regional/Hindi relevance, trust, engagement.
 */

import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const TRUSTED_SOURCES = [
  "pti",
  "ani",
  "reuters",
  "ap ",
  "bbc",
  "ndtv",
  "aaj tak",
  "abp",
  "zee",
  "india today",
  "the hindu",
  "indian express",
  "dainik",
  "navbharat",
  "haribhoomi",
  "patrika",
];

const CG_MARKERS =
  /छत्तीसगढ|chhattisgarh|raipur|रायपुर|bilaspur|बिलासपुर|bastar|बस्तर|durg|दुर्ग|korba|कोरबा|jagdalpur/i;
const HINDI_RE = /[\u0900-\u097F]/;
const POLITICS_RE =
  /विधान|चुनाव|मंत्री|सरकार|assembly|election|parliament|modi|bjp|congress|राजनीति/i;

export type FeedQualityBreakdown = {
  freshness: number;
  image: number;
  regional: number;
  sourceTrust: number;
  engagement: number;
  hindi: number;
  politics: number;
  total: number;
};

function hoursSince(iso: string | null): number {
  if (!iso) return 72;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function freshnessScore(hours: number): number {
  if (hours <= 1) return 28;
  if (hours <= 3) return 24;
  if (hours <= 8) return 18;
  if (hours <= 24) return 12;
  if (hours <= 48) return 6;
  return 2;
}

function imageScore(row: GeneratedArticleRow): number {
  const url =
    row.hero_image_url ||
    row.editorial_metadata?.image?.hero_url ||
    row.editorial_metadata?.image?.og_url;
  if (!url?.trim()) return 0;
  if (/placeholder|fallback|newsroom-desk/i.test(url)) return 4;
  return 14;
}

function regionalScore(row: GeneratedArticleRow): number {
  const text = `${row.headline} ${row.summary ?? ""} ${row.tags.join(" ")}`;
  let score = 0;
  if (CG_MARKERS.test(text)) score += 22;
  if (row.tags.some((t) => /chhattisgarh|raipur|cg|bastar/i.test(t))) score += 12;
  if (row.tags.includes("chhattisgarh")) score += 8;
  return Math.min(30, score);
}

function hindiScore(row: GeneratedArticleRow): number {
  const text = `${row.headline} ${row.summary ?? ""}`;
  if (row.language === "hi" || HINDI_RE.test(text)) return 12;
  return 0;
}

function politicsScore(row: GeneratedArticleRow): number {
  const text = `${row.headline} ${row.summary ?? ""}`;
  if (POLITICS_RE.test(text)) return 8;
  if (row.tags.some((t) => /politic|nation|india/i.test(t))) return 5;
  return 0;
}

function sourceTrustScore(row: GeneratedArticleRow): number {
  const meta = row.editorial_metadata ?? {};
  const sources = [
    ...(meta.source_attribution?.map((s) => s.source?.toLowerCase() ?? "") ?? []),
    row.headline,
  ].join(" ");

  for (const trusted of TRUSTED_SOURCES) {
    if (sources.includes(trusted)) return 12;
  }

  const count = meta.source_count ?? meta.source_attribution?.length ?? 0;
  if (count >= 3) return 10;
  if (count >= 2) return 7;
  return meta.used_fallback ? 2 : 5;
}

function engagementScore(row: GeneratedArticleRow): number {
  const meta = row.editorial_metadata ?? {};
  const confidence = meta.ai_confidence ?? 0.45;
  const breaking = meta.is_breaking ? 8 : 0;
  const trend = (meta.trend_score ?? 0) * 6;
  const pin = row.homepage_pin ? 10 : 0;
  return Math.min(20, Math.round(confidence * 12) + breaking + trend + pin);
}

export function computeFeedQualityScore(row: GeneratedArticleRow): FeedQualityBreakdown {
  const hours = hoursSince(row.published_at ?? row.created_at);
  const freshness = freshnessScore(hours);
  const image = imageScore(row);
  const regional = regionalScore(row);
  const sourceTrust = sourceTrustScore(row);
  const engagement = engagementScore(row);
  const hindi = hindiScore(row);
  const politics = politicsScore(row);

  const total =
    freshness + image + regional + sourceTrust + engagement + hindi + politics;

  return {
    freshness,
    image,
    regional,
    sourceTrust,
    engagement,
    hindi,
    politics,
    total,
  };
}

/** Sort pool for homepage — CG / Raipur / Hindi / politics first */
export function rankPoolByFeedQuality(
  rows: GeneratedArticleRow[]
): GeneratedArticleRow[] {
  return [...rows].sort((a, b) => {
    const sa = computeFeedQualityScore(a).total;
    const sb = computeFeedQualityScore(b).total;
    if (sb !== sa) return sb - sa;
    const ta = new Date(a.published_at ?? a.created_at).getTime();
    const tb = new Date(b.published_at ?? b.created_at).getTime();
    return tb - ta;
  });
}
