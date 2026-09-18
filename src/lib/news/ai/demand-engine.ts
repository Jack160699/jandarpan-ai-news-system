import { GeneratedArticleRow } from "@/lib/news/ai/article-type";

export type DemandSignals = {
  searchDemand: number;
  trendVelocity: number;
  utilityValue: number;
  localRelevance: number;
  overallDemandScore: number;
};

/**
 * Heuristic evaluation of search demand and utility value based on editorial metadata.
 */
export function computeDemandSignals(
  row: GeneratedArticleRow,
  geoMetadata?: Record<string, unknown>
): DemandSignals {
  const meta = (row.editorial_metadata as Record<string, unknown>) ?? {};
  
  // 1. Search Demand (0-100)
  // Derived from existing SEO/search signals if available, or keyword value
  let searchDemand = Number(meta.search_demand_score ?? 0);
  if (!searchDemand) {
    const isEvergreen = meta.content_type === "utility" || meta.content_type === "explainer";
    searchDemand = isEvergreen ? 70 : 40;
  }

  // 2. Trend Velocity (0-100)
  // How fast is this topic growing? Breaking news has high trend velocity.
  let trendVelocity = Number(meta.trend_velocity ?? 0);
  if (!trendVelocity) {
    const isBreaking = Number(meta.breaking_score ?? 0) >= 0.75 || Boolean(meta.breaking_override);
    trendVelocity = isBreaking ? 90 : 30;
  }

  // 3. Utility Value (0-100)
  // Does this article provide utility (weather, jobs, petrol prices, govt schemes)?
  let utilityValue = 0;
  const tags = Array.isArray(meta.topic_clusters) ? meta.topic_clusters as string[] : [];
  const text = (row.headline + " " + row.article_body).toLowerCase();
  
  if (
    tags.includes("weather") || tags.includes("jobs") || tags.includes("education") || 
    tags.includes("schemes") || text.includes("weather") || text.includes("mausam") || 
    text.includes("petrol") || text.includes("sarkari") || text.includes("vacancy") ||
    meta.content_type === "utility"
  ) {
    utilityValue = 85;
  }

  // 4. Local Relevance (0-100)
  let localRelevance = Number(meta.local_relevance ?? 0) * 100;
  if (!localRelevance) {
    const geo = geoMetadata ?? (row.geo_metadata as Record<string, unknown> ?? {});
    if (geo.is_chhattisgarh) localRelevance = 60;
    if (geo.primary_district) localRelevance = 90;
  }

  // Calculate overall demand score (weighted average)
  // Weighting favors Ads-Revenue SEO (High Search Demand + Utility + Local)
  const overallDemandScore = (
    (searchDemand * 0.3) + 
    (trendVelocity * 0.2) + 
    (utilityValue * 0.3) + 
    (localRelevance * 0.2)
  );

  return {
    searchDemand,
    trendVelocity,
    utilityValue,
    localRelevance,
    overallDemandScore: Math.round(overallDemandScore)
  };
}
