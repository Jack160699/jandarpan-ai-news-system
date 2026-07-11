/**
 * System Validation — persistence
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  RecoveryAction,
  SystemHealthScores,
  ValidationModuleResult,
  ValidationRunSummary,
} from "@/lib/system-validation/types";
import type { RecoveryAttempt } from "@/lib/system-validation/self-healing";

type ValidationTable =
  | "system_validation_runs"
  | "system_validation_results"
  | "system_recovery_actions";

function fromValidation(table: ValidationTable) {
  return createAdminServerClient().from(table as never);
}

export async function createValidationRun(input: {
  runType: string;
  triggeredBy?: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await fromValidation("system_validation_runs")
    .insert({
      run_type: input.runType,
      status: "running",
      triggered_by: input.triggeredBy ?? null,
    } as never)
    .select("id")
    .single();

  if (error) return null;
  return String((data as { id: string }).id);
}

export async function completeValidationRun(input: {
  runId: string;
  status: string;
  health: SystemHealthScores;
  productionReady: boolean;
  durationMs: number;
  summary: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await fromValidation("system_validation_runs")
    .update({
      status: input.status,
      overall_score: input.health.overall.score,
      overall_grade: input.health.overall.grade,
      health_scores: input.health,
      production_ready: input.productionReady,
      duration_ms: input.durationMs,
      summary: input.summary,
      completed_at: new Date().toISOString(),
    } as never)
    .eq("id", input.runId);
}

export async function saveValidationResults(
  runId: string,
  modules: ValidationModuleResult[]
): Promise<void> {
  if (!isSupabaseConfigured() || modules.length === 0) return;

  await fromValidation("system_validation_results").insert(
    modules.map((m) => ({
      run_id: runId,
      module_id: m.moduleId,
      category: m.category,
      status: m.status,
      message: m.message ?? null,
      details: m.details ?? {},
      latency_ms: m.latencyMs,
    })) as never
  );
}

export async function saveRecoveryActions(
  runId: string | null,
  actions: RecoveryAttempt[]
): Promise<RecoveryAction[]> {
  if (!isSupabaseConfigured() || actions.length === 0) return [];

  const { data } = await fromValidation("system_recovery_actions")
    .insert(
      actions.map((a) => ({
        run_id: runId,
        action_type: a.actionType,
        target: a.target,
        status: a.status,
        message: a.message,
        metadata: a.metadata ?? {},
      })) as never
    )
    .select("id, action_type, target, status, message, created_at");

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      actionType: String(r.action_type),
      target: (r.target as string | null) ?? null,
      status: r.status as RecoveryAction["status"],
      message: (r.message as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });
}

export async function getLastValidationRun(): Promise<ValidationRunSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await fromValidation("system_validation_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as Record<string, unknown>;
  const summary = (row.summary as Record<string, unknown>) ?? {};

  return {
    id: String(row.id),
    runType: String(row.run_type),
    status: String(row.status),
    overallScore: Number(row.overall_score),
    overallGrade: String(row.overall_grade),
    productionReady: Boolean(row.production_ready),
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null,
    createdAt: String(row.created_at),
    completedAt: (row.completed_at as string | null) ?? null,
    moduleCount: Number(summary.moduleCount ?? 0),
    passCount: Number(summary.passCount ?? 0),
    warnCount: Number(summary.warnCount ?? 0),
    failCount: Number(summary.failCount ?? 0),
  };
}

export async function getRecentRecoveryActions(limit = 10): Promise<RecoveryAction[]> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await fromValidation("system_recovery_actions")
    .select("id, action_type, target, status, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      actionType: String(r.action_type),
      target: (r.target as string | null) ?? null,
      status: r.status as RecoveryAction["status"],
      message: (r.message as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });
}
