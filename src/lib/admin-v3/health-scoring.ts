/**
 * Deterministic, weighted canonical health scoring.
 *
 * Phase 1 (Production Recovery): replaces the all-or-nothing
 * `estimateScoreFromState` behaviour (which snapped "critical" to a fixed 28/F)
 * with a per-subsystem weighted score. Critical required systems carry the most
 * weight; optional external providers carry the least. A single optional
 * provider failure can no longer collapse the whole score.
 *
 * The score is fully deterministic given the subsystem states — no magic
 * numbers are hardcoded to a target grade.
 */

import type { CanonicalHealthState } from "@/lib/admin-v3/canonical-health";

export type SubsystemId =
  | "website"
  | "database"
  | "ingestion"
  | "editorial"
  | "publishing"
  | "ai"
  | "translation"
  | "images"
  | "seo"
  | "external";

/**
 * Weights sum to 1.00. Required/core systems (website, database, publishing,
 * editorial) dominate; optional external providers (GNews etc.) are capped low.
 */
export const SUBSYSTEM_WEIGHTS: Record<SubsystemId, number> = {
  website: 0.16,
  database: 0.16,
  publishing: 0.14,
  editorial: 0.12,
  ingestion: 0.12,
  ai: 0.08,
  translation: 0.06,
  images: 0.05,
  seo: 0.05,
  external: 0.06,
};

/** Per-state subsystem score (0–100). "unknown" is treated optimistically. */
export const STATE_SCORE: Record<CanonicalHealthState, number> = {
  healthy: 100,
  unknown: 80,
  warning: 75,
  degraded: 55,
  critical: 15,
};

export type SubsystemStates = Partial<Record<SubsystemId, CanonicalHealthState>>;

export type CanonicalScoreFactor = {
  subsystem: SubsystemId;
  weight: number;
  state: CanonicalHealthState;
  score: number;
};

export type CanonicalScore = {
  score: number;
  grade: string;
  factors: CanonicalScoreFactor[];
};

export function gradeForScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

/**
 * Compute a weighted 0–100 score from subsystem states. Any subsystem not
 * present defaults to `healthy` (100) so the model degrades gracefully when a
 * caller only knows about a subset of subsystems.
 */
export function computeCanonicalScore(states: SubsystemStates): CanonicalScore {
  const factors: CanonicalScoreFactor[] = (
    Object.keys(SUBSYSTEM_WEIGHTS) as SubsystemId[]
  ).map((subsystem) => {
    const state = states[subsystem] ?? "healthy";
    return {
      subsystem,
      weight: SUBSYSTEM_WEIGHTS[subsystem],
      state,
      score: STATE_SCORE[state],
    };
  });

  const score = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  return { score, grade: gradeForScore(score), factors };
}
