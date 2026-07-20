/**
 * Autonomous District Editorial Engine — shared types
 */

export type RolloutStage = "shadow" | "stage_1" | "stage_2" | "stage_3";

export type DistrictTierLabel = "high" | "medium" | "low";

export type DistrictCoverageRow = {
  districtSlug: string;
  day: string; // YYYY-MM-DD
  target: number;
  published: number;
  deficit: number;
  tier: DistrictTierLabel;
};

export type CoveragePlanItem = {
  districtSlug: string;
  tier: DistrictTierLabel;
  target: number;
  published: number;
  deficit: number;
  priorityScore: number;
};

export type CoveragePlan = {
  day: string;
  mode: RolloutStage;
  publishingEnabled: boolean;
  items: CoveragePlanItem[];
  totalDeficit: number;
  totalTarget: number;
  totalPublished: number;
};

export type GnewsQuotaBucket =
  | "gaps"
  | "statewide"
  | "second_pass"
  | "topical"
  | "reserve";

export type GnewsQuotaAllocation = Record<GnewsQuotaBucket, number>;

export type ClaimEvidence = {
  claimId: string;
  claimText: string;
  sourceUrls: string[];
  supported: boolean;
  notes?: string;
  recordedAt: string;
};

export type ArticleEvidenceLedger = {
  articleId: string;
  claims: ClaimEvidence[];
  updatedAt: string;
};

export type HumanQualityBreakdown = {
  factualGrounding: number;
  districtRelevance: number;
  readability: number;
  sourceDiversity: number;
  freshness: number;
  imagePresence: number;
  headlineClarity: number;
};

export type HumanQualityResult = {
  score: number;
  breakdown: HumanQualityBreakdown;
  publishable: boolean;
  threshold: number;
};

export type PacingDecision = {
  allowed: boolean;
  reason: string;
  maxPerHour: number;
  minDistrictSpacingMinutes: number;
};
