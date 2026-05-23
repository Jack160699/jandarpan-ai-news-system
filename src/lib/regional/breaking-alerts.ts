/**
 * Local breaking alerts — Chhattisgarh-first, district-routed urgency
 */

import { geoFromRecord } from "@/lib/regional/geo-tagging";
import { scoreRegionalTopicFromArticle } from "@/lib/regional/topic-scoring";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const BREAKING_RE =
  /\b(breaking|live|urgent|exclusive|alert|ब्रेकिंग|लाइव|ताजा|बड़ी खबर|आपात)\b/i;

export type LocalBreakingAlert = {
  articleId: string;
  slug: string;
  headline: string;
  district: string | null;
  urgency: "critical" | "high" | "medium";
  localScore: number;
  publishedAt: string;
  reasons: string[];
};

function hoursSince(iso: string | null): number {
  if (!iso) return 72;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function isLocalBreakingCandidate(row: GeneratedArticleRow): boolean {
  const meta = row.editorial_metadata ?? {};
  const text = `${row.headline} ${row.summary ?? ""}`;
  if (meta.is_breaking) return true;
  if ((meta.breaking_score ?? 0) >= 0.65) return true;
  if (BREAKING_RE.test(text)) return true;
  return false;
}

export function buildLocalBreakingAlerts(
  rows: GeneratedArticleRow[],
  options?: {
    homeDistrict?: string | null;
    limit?: number;
    maxAgeHours?: number;
    cgOnly?: boolean;
  }
): LocalBreakingAlert[] {
  const limit = options?.limit ?? 10;
  const maxAgeHours = options?.maxAgeHours ?? 12;
  const cgOnly = options?.cgOnly ?? true;

  const alerts: LocalBreakingAlert[] = [];

  for (const row of rows) {
    if (!isLocalBreakingCandidate(row)) continue;

    const hours = hoursSince(row.published_at ?? row.created_at);
    if (hours > maxAgeHours) continue;

    const geo = geoFromRecord(row);
    if (cgOnly && !geo.is_chhattisgarh && geo.districts.length === 0) continue;

    const topic = scoreRegionalTopicFromArticle(row, options?.homeDistrict);
    const meta = row.editorial_metadata ?? {};

    const reasons: string[] = [];
    if (meta.is_breaking) reasons.push("editorial_breaking");
    if (BREAKING_RE.test(row.headline)) reasons.push("breaking_headline");
    if (geo.is_chhattisgarh) reasons.push("cg_geo");
    if (
      options?.homeDistrict &&
      geo.districts.includes(options.homeDistrict)
    ) {
      reasons.push("home_district");
    }

    let urgency: LocalBreakingAlert["urgency"] = "medium";
    if (hours <= 2 && topic.score >= 55) urgency = "critical";
    else if (hours <= 6 || (meta.breaking_score ?? 0) >= 0.75) urgency = "high";

    alerts.push({
      articleId: row.id,
      slug: row.slug,
      headline: row.headline,
      district: geo.primary_district,
      urgency,
      localScore: topic.score,
      publishedAt: row.published_at ?? row.created_at,
      reasons,
    });
  }

  return alerts
    .sort((a, b) => {
      const urgencyOrder = { critical: 3, high: 2, medium: 1 };
      const u = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (u !== 0) return u;
      return b.localScore - a.localScore;
    })
    .slice(0, limit);
}
