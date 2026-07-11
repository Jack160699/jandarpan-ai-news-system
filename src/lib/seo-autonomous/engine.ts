/**
 * Autonomous SEO Engine — pipeline orchestrator
 *
 * Observe → Analyze → Generate → Policy → Execute → Verify → Measure → Learn
 * Each stage is isolated; failure in one stage does not stop the pipeline.
 */

import { isAutonomousSeoEnabled } from "@/lib/seo-autonomous/config";
import { observe } from "@/lib/seo-autonomous/observe";
import { analyze } from "@/lib/seo-autonomous/analyze";
import { generateActions } from "@/lib/seo-autonomous/action-generator";
import { validatePolicies } from "@/lib/seo-autonomous/policy-engine";
import { executeAction } from "@/lib/seo-autonomous/executor";
import { verifyAction } from "@/lib/seo-autonomous/verifier";
import { measureAction } from "@/lib/seo-autonomous/measurement";
import { learnFromAction } from "@/lib/seo-autonomous/learning";
import {
  getActionById,
  logPolicyDecision,
  logRejectedDraft,
  upsertActionDraft,
} from "@/lib/seo-autonomous/repository";
import { logAutonomous, errorAutonomous } from "@/lib/seo-autonomous/logger";
import type { PipelineRunResult, StageResult } from "@/lib/seo-autonomous/types";

function stageResult(
  stage: StageResult["stage"],
  startedAt: number,
  ok: boolean,
  count?: number,
  errors: string[] = []
): StageResult {
  return {
    stage,
    ok,
    durationMs: Date.now() - startedAt,
    count,
    errors,
  };
}

export async function runAutonomousSeoEngine(): Promise<PipelineRunResult> {
  if (!isAutonomousSeoEnabled()) {
    return {
      ok: true,
      status: "skipped",
      skippedReason: "SEO_AUTONOMOUS_ENGINE_not_enabled",
      stages: [],
      actionsGenerated: 0,
      actionsAllowed: 0,
      actionsExecuted: 0,
      actionsSucceeded: 0,
      actionsFailed: 0,
      errors: [],
    };
  }

  const stages: StageResult[] = [];
  const errors: string[] = [];
  let actionsGenerated = 0;
  let actionsAllowed = 0;
  let actionsExecuted = 0;
  let actionsSucceeded = 0;
  let actionsFailed = 0;

  // ── Observe ──
  const observeStart = Date.now();
  let observation = {
    competitorArticles24h: 0,
    serpOpportunities: 0,
    gscOpenRecommendations: 0,
    executionPending: 0,
    copilotRecommendations: 0,
    gscPagesLowCtr: 0,
    errors: [] as string[],
  };
  try {
    observation = await observe();
    stages.push(stageResult("observe", observeStart, true));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "observe_failed";
    errors.push(msg);
    stages.push(stageResult("observe", observeStart, false, 0, [msg]));
    errorAutonomous("observe_failed", { error: msg });
  }

  // ── Analyze ──
  const analyzeStart = Date.now();
  let opportunities: Awaited<ReturnType<typeof analyze>> = [];
  try {
    opportunities = await analyze(observation);
    stages.push(stageResult("analyze", analyzeStart, true, opportunities.length));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "analyze_failed";
    errors.push(msg);
    stages.push(stageResult("analyze", analyzeStart, false, 0, [msg]));
    errorAutonomous("analyze_failed", { error: msg });
  }

  // ── Generate ──
  const generateStart = Date.now();
  let drafts: Awaited<ReturnType<typeof generateActions>> = [];
  try {
    drafts = await generateActions(opportunities);
    actionsGenerated = drafts.length;
    stages.push(stageResult("generate", generateStart, true, drafts.length));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "generate_failed";
    errors.push(msg);
    stages.push(stageResult("generate", generateStart, false, 0, [msg]));
    errorAutonomous("generate_failed", { error: msg });
  }

  // ── Policy ──
  const policyStart = Date.now();
  const allowedIds: string[] = [];
  try {
    const results = validatePolicies(drafts);
    for (const result of results) {
      if (result.decision === "allowed") {
        const id = await upsertActionDraft(result.draft);
        if (id) {
          allowedIds.push(id);
          await logPolicyDecision({
            actionId: id,
            fieldKey: result.draft.field_key,
            decision: "allowed",
            reason: result.reason,
          });
        }
        actionsAllowed++;
      } else {
        await logRejectedDraft(result.draft, result.reason);
      }
    }
    stages.push(stageResult("policy", policyStart, true, actionsAllowed));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "policy_failed";
    errors.push(msg);
    stages.push(stageResult("policy", policyStart, false, 0, [msg]));
    errorAutonomous("policy_failed", { error: msg });
  }

  // ── Execute (each action isolated) ──
  const executeStart = Date.now();
  const executedIds: string[] = [];
  for (const actionId of allowedIds) {
    try {
      const action = await getActionById(actionId);
      if (!action) continue;

      const result = await executeAction(action);
      actionsExecuted++;
      executedIds.push(actionId);

      if (result.ok) {
        actionsSucceeded++;
      } else {
        actionsFailed++;
      }
    } catch (err) {
      actionsExecuted++;
      actionsFailed++;
      const msg = err instanceof Error ? err.message : "execute_failed";
      errors.push(`execute:${actionId}:${msg}`);
    }
  }
  stages.push(
    stageResult("execute", executeStart, actionsFailed === 0, actionsExecuted)
  );

  // ── Verify (isolated per action) ──
  const verifyStart = Date.now();
  let verifyOk = 0;
  for (const actionId of executedIds) {
    try {
      const action = await getActionById(actionId);
      if (!action || action.status !== "succeeded") continue;
      const verification = await verifyAction(action);
      if (verification.ok) verifyOk++;
    } catch {
      /* isolated */
    }
  }
  stages.push(stageResult("verify", verifyStart, true, verifyOk));

  // ── Measure (isolated per action) ──
  const measureStart = Date.now();
  let measured = 0;
  for (const actionId of executedIds) {
    try {
      const action = await getActionById(actionId);
      if (!action || action.status !== "succeeded") continue;
      await measureAction(action);
      measured++;
    } catch {
      /* isolated */
    }
  }
  stages.push(stageResult("measure", measureStart, true, measured));

  // ── Learn (isolated per action) ──
  const learnStart = Date.now();
  let learned = 0;
  for (const actionId of executedIds) {
    try {
      const action = await getActionById(actionId);
      if (!action) continue;
      const verification = action.status === "succeeded";
      await learnFromAction({
        actionType: action.action_type,
        fieldKey: action.field_key,
        confidence: action.confidence,
        verificationOk: verification,
      });
      learned++;
    } catch {
      /* isolated */
    }
  }
  stages.push(stageResult("learn", learnStart, true, learned));

  const ok = errors.length === 0 || actionsSucceeded > 0;
  const status =
    errors.length > 0 && actionsSucceeded === 0 ? "partial" : "completed";

  logAutonomous("pipeline_complete", {
    actionsGenerated,
    actionsAllowed,
    actionsExecuted,
    actionsSucceeded,
    actionsFailed,
    errors: errors.length,
  });

  return {
    ok,
    status,
    stages,
    actionsGenerated,
    actionsAllowed,
    actionsExecuted,
    actionsSucceeded,
    actionsFailed,
    errors,
  };
}
