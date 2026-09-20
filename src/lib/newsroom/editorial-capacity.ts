export const EDITORIAL_CAPACITY = {
  dailyLimit: 12,
  editions: {
    morning: 6,
    noon: 0,
    afternoon: 0,
    evening: 6,
    night: 0,
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
  /** Target batch limit for editorial_generate */
  defaultEditorialBatchLimit: EDITORIAL_CAPACITY.editions.morning,
  maxManualGenerateBatchLimit:
    EDITORIAL_CAPACITY.editions.morning + EDITORIAL_CAPACITY.editions.evening,
  postGenerateImageQueueLimit: EDITORIAL_CAPACITY.editions.morning - 1,
  legacyPublishFromEventsDefaultLimit: EDITORIAL_CAPACITY.editions.morning,
} as const;

