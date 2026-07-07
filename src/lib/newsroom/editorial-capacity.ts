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

export type EditorialEditionKey = keyof typeof EDITORIAL_CAPACITY.editions;

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

