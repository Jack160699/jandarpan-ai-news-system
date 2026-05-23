/**
 * Regional analytics logs — REGIONAL_ANALYTICS & LOCAL_TREND_SIGNALS
 */

export type RegionalAnalyticsPayload = {
  event: string;
  districtCount?: number;
  articleCount?: number;
  breakingCount?: number;
  trendCount?: number;
  homeDistrict?: string | null;
  cgShare?: number;
  topDistrict?: string | null;
  [key: string]: unknown;
};

export type LocalTrendSignalsPayload = {
  poolSize: number;
  windowHours: number;
  signalCount: number;
  topDistrict: string | null;
  topTopic: string | null;
  signals: Array<{
    key: string;
    type: string;
    velocity: number;
    count: number;
  }>;
};

export function logRegionalAnalytics(payload: RegionalAnalyticsPayload): void {
  console.log("[REGIONAL_ANALYTICS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}

export function logLocalTrendSignals(payload: LocalTrendSignalsPayload): void {
  console.log("[LOCAL_TREND_SIGNALS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}

export function buildRegionalRankingSnapshot(input: {
  poolSize: number;
  cgCount: number;
  districtTagged: number;
  topDistrict: string | null;
  avgRegionalScore: number;
}): void {
  logRegionalAnalytics({
    event: "homepage_regional_rank",
    poolSize: input.poolSize,
    cgShare: input.poolSize
      ? Math.round((input.cgCount / input.poolSize) * 100) / 100
      : 0,
    districtTagged: input.districtTagged,
    topDistrict: input.topDistrict,
    avgRegionalScore: input.avgRegionalScore,
  });
}
