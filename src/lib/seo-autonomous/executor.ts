/**
 * Stage 5 — Execute safe actions independently with retries
 */

import {
  applyApprovedSuggestions,
  rollbackExecution,
} from "@/lib/seo-execution/apply-engine";
import type { ExecutionSuggestion } from "@/lib/seo-execution/types";
import type { SeoAction } from "@/lib/seo-autonomous/types";
import { AUTONOMOUS_MAX_RETRIES } from "@/lib/seo-autonomous/config";
import { updateActionStatus } from "@/lib/seo-autonomous/repository";
import { logAutonomous, errorAutonomous } from "@/lib/seo-autonomous/logger";

function toExecutionSuggestion(action: SeoAction): ExecutionSuggestion {
  return {
    id: action.id,
    job_id: String(action.metadata?.job_id ?? action.id),
    generated_article_id: action.article_id,
    suggestion_type: action.action_type as ExecutionSuggestion["suggestion_type"],
    field_key: action.field_key,
    current_value: action.current_value,
    suggested_value: action.suggested_value,
    reason: action.reason,
    expected_impact: action.expected_impact,
    confidence: action.confidence,
    priority: "medium",
    status: "approved",
    metadata: action.metadata ?? {},
    created_at: action.created_at,
  };
}

export async function executeAction(action: SeoAction): Promise<{
  ok: boolean;
  historyId?: string;
  error?: string;
}> {
  await updateActionStatus(action.id, "executing");

  let lastError = "unknown";
  for (let attempt = 0; attempt < AUTONOMOUS_MAX_RETRIES; attempt++) {
    try {
      const result = await applyApprovedSuggestions({
        articleId: action.article_id,
        articleSlug: action.article_slug,
        jobId: String(action.metadata?.job_id ?? action.id),
        suggestions: [toExecutionSuggestion(action)],
        appliedBy: "seo-autonomous-engine",
        appliedByEmail: "autonomous@system",
      });

      if (result.ok) {
        await updateActionStatus(action.id, "succeeded", {
          execution_history_id: result.historyId ?? null,
          retries: attempt,
        });
        logAutonomous("action_executed", {
          actionId: action.id,
          field: action.field_key,
          historyId: result.historyId,
        });
        return { ok: true, historyId: result.historyId };
      }

      lastError = result.errors.join("; ") || "apply_failed";
    } catch (err) {
      lastError = err instanceof Error ? err.message : "execute_failed";
    }
  }

  await updateActionStatus(action.id, "failed", {
    error_message: lastError,
    retries: AUTONOMOUS_MAX_RETRIES,
  });
  errorAutonomous("action_failed", { actionId: action.id, error: lastError });
  return { ok: false, error: lastError };
}

export async function rollbackAction(action: SeoAction): Promise<boolean> {
  if (!action.execution_history_id) return false;

  const result = await rollbackExecution(
    action.execution_history_id,
    "seo-autonomous-engine",
    "autonomous@system"
  );

  if (result.ok) {
    await updateActionStatus(action.id, "rolled_back");
    logAutonomous("action_rolled_back", { actionId: action.id });
    return true;
  }

  return false;
}
