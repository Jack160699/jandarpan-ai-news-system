/**
 * Autonomous SEO Engine — feature flag and tunables
 */

export function isAutonomousSeoEnabled(): boolean {
  return process.env.SEO_AUTONOMOUS_ENGINE === "true";
}

export const AUTONOMOUS_MAX_ARTICLES = Number(
  process.env.SEO_AUTONOMOUS_MAX_ARTICLES ?? 20
);

export const AUTONOMOUS_MAX_ACTIONS = Number(
  process.env.SEO_AUTONOMOUS_MAX_ACTIONS ?? 40
);

export const AUTONOMOUS_MIN_CONFIDENCE = Number(
  process.env.SEO_AUTONOMOUS_MIN_CONFIDENCE ?? 0.72
);

export const AUTONOMOUS_MAX_RETRIES = Number(
  process.env.SEO_AUTONOMOUS_MAX_RETRIES ?? 3
);
