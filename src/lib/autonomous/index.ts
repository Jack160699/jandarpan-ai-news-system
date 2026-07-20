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
  describeRolloutState,
  getAutonomousRolloutStage,
  isAutonomousKillSwitchOn,
  isAutonomousPublishingEnabled,
} from "@/lib/autonomous/rollout-state";

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
  REVIEW_THRESHOLD,
  meetsPublishThreshold,
  scoreHumanQuality,
  type HumanQualityInput,
} from "@/lib/autonomous/human-quality-score";

export {
  PACING,
  evaluatePublicationPacing,
  suggestedDistrictWaitMinutes,
  type PacingInput,
} from "@/lib/autonomous/publication-pacing";
