/**
 * Module 6 — SERP Feature Analyzer
 */

import { isJandarpanDomain } from "@/lib/serp-intelligence/parser";
import type {
  SerpCollectedSnapshot,
  SerpFeatureOwnership,
  SerpFeatureType,
} from "@/lib/serp-intelligence/types";

const FEATURE_KEYS: SerpFeatureType[] = [
  "featured_snippet",
  "top_stories",
  "people_also_ask",
  "image_pack",
  "video",
  "news_box",
  "knowledge_panel",
  "local_pack",
];

function featurePresent(
  features: SerpCollectedSnapshot["serp_features"],
  key: SerpFeatureType
): boolean {
  return Boolean(features[key]);
}

function qualifyRecommendation(
  feature: SerpFeatureType,
  jandarpanRanks: boolean
): string {
  const map: Record<SerpFeatureType, string> = {
    featured_snippet:
      "Add concise answer block + FAQ schema at top of article.",
    top_stories:
      "Publish breaking news with fresh timestamps and NewsArticle schema.",
    people_also_ask: "Add FAQ section matching PAA questions in H2/H3 headings.",
    image_pack: "Add high-quality hero image with descriptive alt text.",
    video: "Embed relevant video or create short news clip.",
    news_box: "Increase publish frequency for this topic cluster.",
    knowledge_panel: "Strengthen entity coverage and Organization schema.",
    local_pack: "Add LocalBusiness/Place schema for district-specific stories.",
  };
  const base = map[feature];
  if (!jandarpanRanks) {
    return `${base} Build topical authority with a pillar page first.`;
  }
  return base;
}

export function analyzeSnapshotFeatures(
  snapshot: SerpCollectedSnapshot
): SerpFeatureOwnership[] {
  const jandarpanInTop10 = snapshot.organic_results.some((r) =>
    isJandarpanDomain(r.domain)
  );

  return FEATURE_KEYS.map((feature) => {
    const present = featurePresent(snapshot.serp_features, feature);
    const ownersRaw = snapshot.serp_features.feature_owners[feature] ?? [];
    const ownerCounts = new Map<string, number>();
    for (const domain of ownersRaw) {
      ownerCounts.set(domain, (ownerCounts.get(domain) ?? 0) + 1);
    }

    return {
      feature,
      appearance_rate: present ? 100 : 0,
      owners: [...ownerCounts.entries()].map(([domain, count]) => ({
        domain,
        count,
      })),
      jandarpan_qualifies: present && jandarpanInTop10,
      recommendation: qualifyRecommendation(feature, jandarpanInTop10),
    };
  }).filter((f) => f.appearance_rate > 0 || f.owners.length > 0);
}

export function aggregateFeatureOwnership(
  snapshots: SerpCollectedSnapshot[]
): SerpFeatureOwnership[] {
  if (snapshots.length === 0) return [];

  const totals = new Map<
    SerpFeatureType,
    { appearances: number; owners: Map<string, number>; qualifies: number }
  >();

  for (const key of FEATURE_KEYS) {
    totals.set(key, { appearances: 0, owners: new Map(), qualifies: 0 });
  }

  for (const snapshot of snapshots) {
    const perSnapshot = analyzeSnapshotFeatures(snapshot);
    for (const row of perSnapshot) {
      const entry = totals.get(row.feature)!;
      if (row.appearance_rate > 0) entry.appearances += 1;
      if (row.jandarpan_qualifies) entry.qualifies += 1;
      for (const owner of row.owners) {
        entry.owners.set(
          owner.domain,
          (entry.owners.get(owner.domain) ?? 0) + owner.count
        );
      }
    }
  }

  const total = snapshots.length;

  return FEATURE_KEYS.map((feature) => {
    const entry = totals.get(feature)!;
    const rate = Math.round((entry.appearances / total) * 100);
    const jandarpanInAny = snapshots.some((s) =>
      s.organic_results.some((r) => isJandarpanDomain(r.domain))
    );

    return {
      feature,
      appearance_rate: rate,
      owners: [...entry.owners.entries()]
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      jandarpan_qualifies: entry.qualifies > 0,
      recommendation: qualifyRecommendation(feature, jandarpanInAny),
    };
  }).filter((f) => f.appearance_rate > 0);
}
