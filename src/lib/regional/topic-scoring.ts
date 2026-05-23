/**
 * Regional topic scoring — local relevance for ranking and editorial intelligence
 */

import {
  districtPriorityBoost,
  getDistrict,
  type CgDistrict,
} from "@/lib/regional/districts";
import {
  geoFromRecord,
  tagGeoFromContent,
  type RegionalGeoMetadata,
} from "@/lib/regional/geo-tagging";

const LOCAL_TOPIC_RE =
  /\b(gram panchayat|panchayat|collector|dm\b|mla\b|mp\b|naxal|naxalite|police|court|hospital|flood|crop|farmer|kisan|mandi|nrega|scheme|छत्तीसगढ|रायपुर|बस्तर|जिला|पंचायत|किसान)\b/i;

const CG_POLICY_RE =
  /\b(cm\b|chief minister|cabinet|assembly|vidhan sabha|भूपेश|बघेल|मंत्री|विधानसभा)\b/i;

export type RegionalTopicScore = {
  score: number;
  localRelevance: number;
  districtBoost: number;
  cgStateBoost: number;
  topicSignals: string[];
};

export function scoreRegionalTopic(input: {
  headline: string;
  summary?: string | null;
  articleBody?: string | null;
  region?: string | null;
  category?: string | null;
  geo?: RegionalGeoMetadata;
  homeDistrict?: string | null;
}): RegionalTopicScore {
  const geo =
    input.geo ??
    tagGeoFromContent({
      title: input.headline,
      body: [input.summary, input.articleBody].filter(Boolean).join("\n"),
      region: input.region,
      category: input.category,
    });

  const blob = [input.headline, input.summary, input.articleBody]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let localRelevance = 0.4;
  const topicSignals: string[] = [];

  if (geo.is_chhattisgarh) {
    localRelevance += 0.28;
    topicSignals.push("cg_state");
  }
  if (geo.primary_district) {
    localRelevance += 0.18;
    topicSignals.push(`district:${geo.primary_district}`);
  }
  if (LOCAL_TOPIC_RE.test(blob)) {
    localRelevance += 0.14;
    topicSignals.push("hyperlocal_topic");
  }
  if (CG_POLICY_RE.test(blob)) {
    localRelevance += 0.1;
    topicSignals.push("cg_policy");
  }
  if (input.category?.toLowerCase() === "local") {
    localRelevance += 0.12;
    topicSignals.push("local_category");
  }

  localRelevance = Math.min(1, Math.round(localRelevance * 1000) / 1000);

  let districtBoost = 0;
  const primary = geo.primary_district;
  if (primary) districtBoost = districtPriorityBoost(primary);

  if (input.homeDistrict && geo.districts.includes(input.homeDistrict)) {
    districtBoost += 6;
    topicSignals.push("home_district_match");
  }

  const cgStateBoost = geo.is_chhattisgarh ? 12 : 0;
  const score = Math.min(
    100,
    Math.round(
      (localRelevance * 40 + districtBoost + cgStateBoost + geo.confidence * 8) *
        10
    ) / 10
  );

  return {
    score,
    localRelevance,
    districtBoost,
    cgStateBoost,
    topicSignals,
  };
}

export function scoreRegionalTopicFromArticle(
  row: {
    headline: string;
    summary?: string | null;
    article_body?: string | null;
    tags?: string[];
    geo_metadata?: RegionalGeoMetadata | Record<string, unknown> | null;
    editorial_metadata?: Record<string, unknown> | null;
  },
  homeDistrict?: string | null
): RegionalTopicScore {
  const geo = geoFromRecord(row);
  return scoreRegionalTopic({
    headline: row.headline,
    summary: row.summary,
    articleBody: row.article_body,
    category: row.tags?.[0] ?? null,
    geo,
    homeDistrict,
  });
}

export function formatDistrictLabel(slug: string): { en: string; hi: string } {
  const d: CgDistrict | undefined = getDistrict(slug);
  return { en: d?.name ?? slug, hi: d?.nameHi ?? slug };
}
