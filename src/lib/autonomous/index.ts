/**
 * Autonomous District Editorial + Image Engine — public exports
 */

export type {
  ArticleEvidenceLedger,
  ClaimEvidence,
  CoveragePlan,
  CoveragePlanItem,
  DistrictCoverageRow,
  DistrictTierLabel,
  GnewsQuotaAllocation,
  GnewsQuotaBucket,
  HumanQualityBreakdown,
  HumanQualityResult,
  PacingDecision,
  RolloutStage,
} from "@/lib/autonomous/types";

export {
  activateStage1,
  describeRolloutState,
  getAutonomousRolloutStage,
  isAutonomousKillSwitchOn,
  isAutonomousPublishingEnabled,
  type ActivateStage1Result,
} from "@/lib/autonomous/rollout-state";

export {
  formatIstDay,
  getIstDayBounds,
  istWallTimeToUtcDate,
  type IstDayBounds,
} from "@/lib/autonomous/ist-day";

export {
  getSourcesForDistrict,
  getVerifiedOfficialSources,
  listOfficialSources,
  type OfficialSource,
  type OfficialSourceStatus,
} from "@/lib/autonomous/official-sources";

export {
  buildCoveragePlan,
  computeDistrictDeficit,
  getUnderCoveredDistricts,
  runCoverageController,
  type BuildCoveragePlanInput,
  type PublishedCountByDistrict,
} from "@/lib/autonomous/coverage-controller";

export {
  GNEWS_QUOTA_ALLOCATION_PCT,
  allocateRequestBudget,
  assertAllocationSumsTo100,
  buildDistrictGapQueries,
  createInMemoryQuotaPlanner,
  isQuotaSoftExhausted,
  planGnewsQuota,
  type GnewsDistrictQuery,
  type GnewsQuotaLedgerSnapshot,
  type GnewsQuotaPlan,
  type PersistedQuotaPlanner,
} from "@/lib/autonomous/gnews-quota-planner";

export {
  createEmptyLedger,
  hasUnsupportedClaims,
  listUnsupportedClaims,
  recordClaim,
  removeUnsupportedClaims,
} from "@/lib/autonomous/evidence-ledger";

export {
  HUMAN_QUALITY_WEIGHTS,
  PUBLISH_THRESHOLD,
  REPAIR_THRESHOLD,
  REVIEW_THRESHOLD,
  HIGH_RISK_THRESHOLD,
  decideQualityGate,
  isHighRiskStory,
  meetsPublishThreshold,
  scoreHumanQuality,
  type HumanQualityInput,
  type QualityGateDecision,
  type QualityGateResult,
} from "@/lib/autonomous/human-quality-score";

export {
  PACING,
  evaluatePublicationPacing,
  suggestedDistrictWaitMinutes,
  type PacingInput,
} from "@/lib/autonomous/publication-pacing";
