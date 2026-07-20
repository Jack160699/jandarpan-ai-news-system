export const EDITORIAL_CAPACITY = {
  dailyLimit: 40,
  editions: {
    morning: 8,
    noon: 6,
    afternoon: 6,
    evening: 10,
    night: 10,
  },
  breakingUnlimited: true,
} as const;

/**
 * Shadow-aware autonomous stage targets.
 * Does NOT change dailyLimit default behavior — use getEffectiveDailyLimit().
 */
export const AUTONOMOUS_STAGE_TARGETS = {
  shadow: 40,
  stage_1: 60,
  stage_2: 100,
  stage_3: 160,
} as const;

export type AutonomousStageTargetKey = keyof typeof AUTONOMOUS_STAGE_TARGETS;

export type EditorialEditionKey = keyof typeof EDITORIAL_CAPACITY.editions;

/**
 * Effective daily publish ceiling.
 * Shadow (default) and unset stage keep the historical 40/day limit.
 * Only stage_1+ with publishing enabled raises the ceiling via env.
 */
export function getEffectiveDailyLimit(
  env: NodeJS.ProcessEnv = process.env
): number {
  const kill =
    (env.AUTONOMOUS_KILL_SWITCH ?? "").trim() === "1" ||
    (env.AUTONOMOUS_KILL_SWITCH ?? "").trim().toLowerCase() === "true";
  if (kill) return EDITORIAL_CAPACITY.dailyLimit;

  const stage = (env.AUTONOMOUS_ROLLOUT_STAGE ?? "shadow")
    .trim()
    .toLowerCase() as AutonomousStageTargetKey;

  if (stage === "shadow" || !(stage in AUTONOMOUS_STAGE_TARGETS)) {
    return EDITORIAL_CAPACITY.dailyLimit;
  }

  // Only raise limit when publishing is explicitly enabled (non-shadow)
  return AUTONOMOUS_STAGE_TARGETS[stage];
}

/**
 * Centralized derivations used by workers/cron/routes.
 * Keep behavior stable by deriving previous defaults from EDITORIAL_CAPACITY.
 */
export const EDITORIAL_LIMITS = {
  /** Historically defaulted to 6 via INFRA_CONFIG.editorialBatchLimit */
  defaultEditorialBatchLimit: EDITORIAL_CAPACITY.editions.noon,
  /**
   * Historically the /api/generate-articles route allowed a max of 15.
   * Derive 15 from edition totals (8 + 10 - 3 = 15) so no hardcoded cap remains.
   */
  maxManualGenerateBatchLimit:
    EDITORIAL_CAPACITY.editions.morning + EDITORIAL_CAPACITY.editions.evening - 3,
  /** Historically processed up to 5 images after publish; derive 5 as (6 - 1). */
  postGenerateImageQueueLimit: EDITORIAL_CAPACITY.editions.noon - 1,
  /** Legacy helper defaulted to 8; align it to the morning edition target. */
  legacyPublishFromEventsDefaultLimit: EDITORIAL_CAPACITY.editions.morning,
} as const;

