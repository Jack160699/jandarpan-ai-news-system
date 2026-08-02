/**
 * Daily Newsroom Audit Report — allow-listed automated remediation actions.
 *
 * Automation is opt-in and gated behind NEWSROOM_AUDIT_AUTOMATION_ENABLED
 * (default false/unset). When disabled, runAutomatedActionsIfEnabled only
 * records recommendations — it never mutates anything else. When enabled,
 * only actions in AUTOMATED_ACTIONS (or the mark_provider_unavailable:<id>
 * family, see resolveAutomatedAction) can execute, and only when the
 * originating recommendation was flagged automation_eligible.
 */

import { revalidatePath } from "next/cache";
import { createAdminServerClient } from "@/lib/supabase";
import { markProviderUnhealthy } from "@/lib/ai/providers/health";
import type { AiProviderId } from "@/lib/ai/providers/types";
import { clearMainSitemapCache } from "@/lib/seo/sitemap-data";
import { pipelineLog, pipelineWarn } from "@/lib/observability/production-log";

export type AutomatedActionResult = { ok: boolean; detail: string };
export type AutomatedAction = { label: string; run: () => Promise<AutomatedActionResult> };

const KNOWN_PROVIDERS: AiProviderId[] = [
  "openai",
  "openrouter",
  "gemini",
  "groq",
  "cloudflare",
  "local",
];

async function runRegenerateSitemap(): Promise<AutomatedActionResult> {
  try {
    clearMainSitemapCache();
    revalidatePath("/sitemap.xml");
    return { ok: true, detail: "Cleared in-process sitemap cache and revalidated /sitemap.xml." };
  } catch (err) {
    return {
      ok: false,
      detail: `regenerate_sitemap failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Static entry for the allow-list membership check. Marking a *specific*
 * provider unhealthy needs a provider id, which this no-arg shape can't
 * carry — real invocations go through the `mark_provider_unavailable:<id>`
 * family in resolveAutomatedAction(). Calling this entry directly is a
 * config error, not a silent no-op, so it says so honestly.
 */
async function runMarkProviderUnavailableWithoutTarget(): Promise<AutomatedActionResult> {
  return {
    ok: false,
    detail:
      "mark_provider_unavailable requires a target provider — use action key " +
      "'mark_provider_unavailable:<provider>' (resolved via resolveAutomatedAction), not this generic entry.",
  };
}

function markProviderUnavailableAction(provider: AiProviderId): AutomatedAction {
  return {
    label: `Mark ${provider} unavailable`,
    run: async () => {
      markProviderUnhealthy(provider, {
        reason: "newsroom_audit_automated_action",
      });
      return { ok: true, detail: `${provider} marked unhealthy (in-process cooldown applied).` };
    },
  };
}

async function runPauseStaleBacklog(): Promise<AutomatedActionResult> {
  return {
    ok: true,
    detail:
      "not yet wired to a real backlog pause — placeholder. No queue/worker was actually paused; " +
      "this repo has no concrete backlog-pause mechanism as of this workstream.",
  };
}

/** Small, allow-listed, idempotent automated actions. Keys are the `action` identifiers automation may execute. */
export const AUTOMATED_ACTIONS: Record<string, AutomatedAction> = {
  regenerate_sitemap: { label: "Regenerate sitemap", run: runRegenerateSitemap },
  mark_provider_unavailable: {
    label: "Mark AI provider unavailable",
    run: runMarkProviderUnavailableWithoutTarget,
  },
  pause_stale_backlog: { label: "Pause stale backlog", run: runPauseStaleBacklog },
};

/**
 * Resolve an action key to a runnable entry, including the parameterized
 * `mark_provider_unavailable:<provider>` family that AUTOMATED_ACTIONS'
 * static map can't express directly. Returns null when the key isn't
 * allow-listed (never falls through to arbitrary execution).
 */
export function resolveAutomatedAction(actionKey: string): AutomatedAction | null {
  if (Object.prototype.hasOwnProperty.call(AUTOMATED_ACTIONS, actionKey)) {
    return AUTOMATED_ACTIONS[actionKey]!;
  }
  const providerMatch = /^mark_provider_unavailable:(.+)$/.exec(actionKey);
  if (providerMatch) {
    const candidate = providerMatch[1] as AiProviderId;
    if (KNOWN_PROVIDERS.includes(candidate)) {
      return markProviderUnavailableAction(candidate);
    }
  }
  return null;
}

export type ActionExecutionStatus = "recommended" | "approved" | "automated" | "done" | "rejected";

/**
 * Insert (or update, when idempotencyKey collides) a row in
 * daily_newsroom_report_actions. Idempotency is enforced by the migration's
 * unique partial index on idempotency_key (where not null).
 */
export async function recordActionExecution(
  reportId: string,
  findingId: string | null,
  action: string,
  status: ActionExecutionStatus,
  executedBy: string | null,
  idempotencyKey: string | null,
  extra?: { expectedImpact?: string; ownerSubsystem?: string; urgency?: string; automationEligible?: boolean }
): Promise<void> {
  try {
    const supabase = createAdminServerClient();
    const row = {
      report_id: reportId,
      finding_id: findingId,
      action,
      expected_impact: extra?.expectedImpact ?? null,
      owner_subsystem: extra?.ownerSubsystem ?? null,
      urgency: extra?.urgency ?? null,
      automation_eligible: extra?.automationEligible ?? false,
      status,
      idempotency_key: idempotencyKey,
      executed_at: status === "automated" || status === "done" ? new Date().toISOString() : null,
      executed_by: executedBy,
    };

    if (idempotencyKey) {
      const { error } = await supabase
        .from("daily_newsroom_report_actions" as never)
        .upsert(row as never, { onConflict: "idempotency_key" });
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await supabase.from("daily_newsroom_report_actions" as never).insert(row as never);
    if (error) throw new Error(error.message);
  } catch (err) {
    pipelineWarn("[newsroom_audit_record_action_error]", {
      reportId,
      action,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export type RecommendedAction = {
  action: string;
  expectedImpact?: string;
  ownerSubsystem?: string;
  urgency?: string;
  automationEligible: boolean;
  findingId?: string | null;
  /** Defaults to `${reportId}:${action}` when omitted. */
  idempotencyKey?: string | null;
};

/**
 * Records every recommended action as status='recommended'. When
 * NEWSROOM_AUDIT_AUTOMATION_ENABLED === "true" AND the action was flagged
 * automation_eligible AND it resolves to an allow-listed AUTOMATED_ACTIONS
 * entry, actually runs it and upgrades the record to status='automated' on
 * success (stays 'recommended' on failure — automation attempted but did
 * not take effect).
 */
export async function runAutomatedActionsIfEnabled(
  reportId: string,
  recommendedActions: RecommendedAction[]
): Promise<void> {
  const automationEnabled = process.env.NEWSROOM_AUDIT_AUTOMATION_ENABLED === "true";

  for (const rec of recommendedActions) {
    const idempotencyKey = rec.idempotencyKey ?? `${reportId}:${rec.action}`;
    const extra = {
      expectedImpact: rec.expectedImpact,
      ownerSubsystem: rec.ownerSubsystem,
      urgency: rec.urgency,
      automationEligible: rec.automationEligible,
    };

    if (!automationEnabled || !rec.automationEligible) {
      await recordActionExecution(
        reportId,
        rec.findingId ?? null,
        rec.action,
        "recommended",
        null,
        idempotencyKey,
        extra
      );
      continue;
    }

    const resolved = resolveAutomatedAction(rec.action);
    if (!resolved) {
      await recordActionExecution(
        reportId,
        rec.findingId ?? null,
        rec.action,
        "recommended",
        null,
        idempotencyKey,
        extra
      );
      continue;
    }

    try {
      const result = await resolved.run();
      pipelineLog("[newsroom_audit_automated_action]", {
        reportId,
        action: rec.action,
        ok: result.ok,
        detail: result.detail,
      });
      await recordActionExecution(
        reportId,
        rec.findingId ?? null,
        rec.action,
        result.ok ? "automated" : "recommended",
        result.ok ? "newsroom_audit_automation" : null,
        idempotencyKey,
        extra
      );
    } catch (err) {
      pipelineWarn("[newsroom_audit_automated_action_error]", {
        reportId,
        action: rec.action,
        reason: err instanceof Error ? err.message : String(err),
      });
      await recordActionExecution(
        reportId,
        rec.findingId ?? null,
        rec.action,
        "recommended",
        null,
        idempotencyKey,
        extra
      );
    }
  }
}
