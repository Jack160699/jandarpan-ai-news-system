/**
 * Publication pacing — rate limits for autonomous publishing.
 * Normal: 6–8/hour; breaking: up to 12/hour; district spacing 15–20 min.
 */

import type { PacingDecision } from "@/lib/autonomous/types";

export const PACING = {
  normalMaxPerHour: 8,
  normalMinPerHour: 6,
  breakingMaxPerHour: 12,
  districtSpacingMinMinutes: 15,
  districtSpacingMaxMinutes: 20,
} as const;

export type PacingInput = {
  publishesInLastHour: number;
  isBreaking?: boolean;
  /** Minutes since last publish for this district (null = never) */
  minutesSinceDistrictPublish?: number | null;
  now?: Date;
};

export function evaluatePublicationPacing(input: PacingInput): PacingDecision {
  const maxPerHour = input.isBreaking
    ? PACING.breakingMaxPerHour
    : PACING.normalMaxPerHour;
  const minSpacing = PACING.districtSpacingMinMinutes;

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
  minutesSinceDistrictPublish: number | null | undefined
): number {
  if (minutesSinceDistrictPublish == null) return 0;
  const need = PACING.districtSpacingMinMinutes - minutesSinceDistrictPublish;
  return Math.max(0, Math.ceil(need));
}
