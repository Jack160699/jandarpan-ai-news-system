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

export type ActivateStage1Result = {
  ok: boolean;
  stage: RolloutStage;
  reason: string;
  persisted: boolean;
  error?: string;
};

/**
 * Persist stage_1 into autonomous_rollout_state (singleton id=1).
 * Intended for guarded admin/cron paths only — does not flip env vars.
 *
 * Manual SQL alternative:
 *   update public.autonomous_rollout_state
 *   set stage = 'stage_1', reason = '...', updated_at = now()
 *   where id = 1;
 *
 * Also set AUTONOMOUS_ROLLOUT_STAGE=stage_1 in the deployment env
 * (DB row is the audit trail; runtime gates still read process.env).
 */
export async function activateStage1(
  reason: string
): Promise<ActivateStage1Result> {
  const trimmed = reason.trim() || "stage_1_activation";

  if (isAutonomousKillSwitchOn()) {
    return {
      ok: false,
      stage: "shadow",
      reason: trimmed,
      persisted: false,
      error: "AUTONOMOUS_KILL_SWITCH is on — refuse stage_1 activation",
    };
  }

  try {
    const { createAdminServerClient, isSupabaseConfigured } = await import(
      "@/lib/supabase"
    );
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        stage: getAutonomousRolloutStage(),
        reason: trimmed,
        persisted: false,
        error: "supabase_not_configured",
      };
    }

    const supabase = createAdminServerClient();
    const { error } = await supabase.from("autonomous_rollout_state" as never).upsert(
      {
        id: 1,
        stage: "stage_1",
        reason: trimmed,
        updated_at: new Date().toISOString(),
        metadata: {
          activated_via: "activateStage1",
          at: new Date().toISOString(),
        },
      } as never,
      { onConflict: "id" }
    );

    if (error) {
      return {
        ok: false,
        stage: getAutonomousRolloutStage(),
        reason: trimmed,
        persisted: false,
        error: error.message,
      };
    }

    return {
      ok: true,
      stage: "stage_1",
      reason: trimmed,
      persisted: true,
    };
  } catch (err) {
    return {
      ok: false,
      stage: getAutonomousRolloutStage(),
      reason: trimmed,
      persisted: false,
      error: err instanceof Error ? err.message : "activate_failed",
    };
  }
}
