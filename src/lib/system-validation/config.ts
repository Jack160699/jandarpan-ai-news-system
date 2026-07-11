/**
 * System Validation Engine — feature flag
 */

export function isSystemValidationEnabled(): boolean {
  return process.env.SYSTEM_VALIDATION_ENGINE === "true";
}

export const VALIDATION_SELF_HEAL =
  process.env.SYSTEM_VALIDATION_SELF_HEAL !== "false";

export const VALIDATION_FETCH_TIMEOUT_MS = Number(
  process.env.SYSTEM_VALIDATION_FETCH_TIMEOUT_MS ?? 8000
);
