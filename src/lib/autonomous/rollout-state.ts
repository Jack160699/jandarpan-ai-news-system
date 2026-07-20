/**
 * Autonomous rollout stage + kill switch.
 * Production default: SHADOW (plan-only, no publish volume increase).
 */

import type { RolloutStage } from "@/lib/autonomous/types";

const VALID_STAGES: readonly RolloutStage[] = [
  "shadow",
  "stage_1",
  "stage_2",
  "stage_3",
] as const;

export function getAutonomousRolloutStage(
  env: NodeJS.ProcessEnv = process.env
): RolloutStage {
  const raw = (env.AUTONOMOUS_ROLLOUT_STAGE ?? "shadow").trim().toLowerCase();
  if ((VALID_STAGES as readonly string[]).includes(raw)) {
    return raw as RolloutStage;
  }
  return "shadow";
}

export function isAutonomousKillSwitchOn(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const v = (env.AUTONOMOUS_KILL_SWITCH ?? "").trim();
  return v === "1" || v.toLowerCase() === "true";
}

/**
 * Publishing via the autonomous coverage controller is disabled in shadow
 * and when the kill switch is on. Stage 1+ may publish only when switch is off.
 */
export function isAutonomousPublishingEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (isAutonomousKillSwitchOn(env)) return false;
  const stage = getAutonomousRolloutStage(env);
  return stage !== "shadow";
}

export function describeRolloutState(env: NodeJS.ProcessEnv = process.env): {
  stage: RolloutStage;
  killSwitch: boolean;
  publishingEnabled: boolean;
} {
  return {
    stage: getAutonomousRolloutStage(env),
    killSwitch: isAutonomousKillSwitchOn(env),
    publishingEnabled: isAutonomousPublishingEnabled(env),
  };
}
