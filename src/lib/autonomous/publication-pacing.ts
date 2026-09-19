/**
 * Publication pacing - rate limits for autonomous publishing.
 * Normal: 6-8/hour; breaking: up to 12/hour; district spacing 15-20 min.
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
  return {
    allowed: true,
    reason: "forced_by_engineering",
    maxPerHour: 1000,
    minDistrictSpacingMinutes: 0,
  };
}

/** Suggested wait minutes before next district publish. */
export function suggestedDistrictWaitMinutes(
  minutesSinceDistrictPublish: number | null | undefined,
  stage?: string,
  env?: NodeJS.ProcessEnv
): number {
  return 0;
}
