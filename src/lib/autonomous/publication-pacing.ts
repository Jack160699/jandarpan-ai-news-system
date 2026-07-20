/**
 * Publication pacing — rate limits for autonomous publishing.
 * Normal: 6–8/hour; breaking: up to 12/hour; district spacing 15–20 min.
 * Stage 1 soft cap: 4 routine / hour; district spacing min 20 min.
 */

import { getAutonomousRolloutStage } from "@/lib/autonomous/rollout-state";
import type { PacingDecision } from "@/lib/autonomous/types";

export const PACING = {
  normalMaxPerHour: 8,
  normalMinPerHour: 6,
  breakingMaxPerHour: 12,
  /** Soft hourly cap for stage_1 routine (non-breaking) publishes */
  stage1RoutineMaxPerHour: 4,
  districtSpacingMinMinutes: 15,
  districtSpacingMaxMinutes: 20,
} as const;

export type PacingInput = {
  publishesInLastHour: number;
  isBreaking?: boolean;
  /** Minutes since last publish for this district (null = never) */
  minutesSinceDistrictPublish?: number | null;
  now?: Date;
  /** Override stage detection (tests) */
  stage?: string;
  env?: NodeJS.ProcessEnv;
};

export function evaluatePublicationPacing(input: PacingInput): PacingDecision {
  const stage =
    input.stage ??
    getAutonomousRolloutStage(input.env ?? process.env);

  let maxPerHour: number = input.isBreaking
    ? PACING.breakingMaxPerHour
    : PACING.normalMaxPerHour;

  if (stage === "stage_1" && !input.isBreaking) {
    maxPerHour = PACING.stage1RoutineMaxPerHour;
  }

  // Stage_1: enforce the upper end of the 15–20m district spacing band (min 20m).
  const minSpacing =
    stage === "stage_1"
      ? PACING.districtSpacingMaxMinutes
      : PACING.districtSpacingMinMinutes;

  if (input.publishesInLastHour >= maxPerHour) {
    return {
      allowed: false,
      reason: `Hourly cap reached (${input.publishesInLastHour}/${maxPerHour})`,
      maxPerHour,
      minDistrictSpacingMinutes: minSpacing,
    };
  }

  const since = input.minutesSinceDistrictPublish;
  if (since != null && since < minSpacing) {
    return {
      allowed: false,
      reason: `District spacing: ${since.toFixed(1)}m < ${minSpacing}m`,
      maxPerHour,
      minDistrictSpacingMinutes: minSpacing,
    };
  }

  return {
    allowed: true,
    reason: "within_pacing_limits",
    maxPerHour,
    minDistrictSpacingMinutes: minSpacing,
  };
}

/** Suggested wait minutes before next district publish. */
export function suggestedDistrictWaitMinutes(
  minutesSinceDistrictPublish: number | null | undefined,
  stage?: string,
  env?: NodeJS.ProcessEnv
): number {
  if (minutesSinceDistrictPublish == null) return 0;
  const resolved =
    stage ?? getAutonomousRolloutStage(env ?? process.env);
  const need =
    (resolved === "stage_1"
      ? PACING.districtSpacingMaxMinutes
      : PACING.districtSpacingMinMinutes) - minutesSinceDistrictPublish;
  return Math.max(0, Math.ceil(need));
}
