/**
 * Autonomous SEO — Supabase persistence
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  AutonomousDashboard,
  MetricType,
  PolicyDecision,
  SeoAction,
  SeoActionDraft,
} from "@/lib/seo-autonomous/types";

type AutonomousTable =
  | "seo_actions"
  | "seo_action_results"
  | "seo_learning"
  | "seo_policy_log";

function fromAutonomous(table: AutonomousTable) {
  return createAdminServerClient().from(table as never);
}

function mapAction(row: Record<string, unknown>): SeoAction {
  return {
    id: String(row.id),
    external_key: String(row.external_key),
    action_type: String(row.action_type),
    article_id: String(row.article_id),
    article_slug: String(row.article_slug),
    field_key: String(row.field_key),
    current_value: (row.current_value as string | null) ?? null,
    suggested_value: String(row.suggested_value),
    reason: String(row.reason),
    confidence: Number(row.confidence),
    expected_impact: String(row.expected_impact ?? ""),
    rollback_strategy: String(row.rollback_strategy ?? "snapshot_restore"),
    status: row.status as SeoAction["status"],
    policy_status: row.policy_status as PolicyDecision,
    execution_history_id: (row.execution_history_id as string | null) ?? null,
    retries: Number(row.retries ?? 0),
    error_message: (row.error_message as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
    executed_at: (row.executed_at as string | null) ?? null,
  };
}

export async function upsertActionDraft(draft: SeoActionDraft): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await fromAutonomous("seo_actions")
    .upsert(
      {
        external_key: draft.external_key,
        action_type: draft.action_type,
        article_id: draft.article_id,
        article_slug: draft.article_slug,
        field_key: draft.field_key,
        current_value: draft.current_value,
        suggested_value: draft.suggested_value,
        reason: draft.reason,
        confidence: draft.confidence,
        expected_impact: draft.expected_impact,
        rollback_strategy: draft.rollback_strategy,
        policy_status: "allowed",
        status: "pending",
        metadata: draft.metadata ?? {},
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "external_key", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data ? String((data as { id: string }).id) : null;
}

export async function logPolicyDecision(input: {
  actionId?: string;
  fieldKey: string;
  decision: PolicyDecision;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await fromAutonomous("seo_policy_log").insert({
    action_id: input.actionId ?? null,
    field_key: input.fieldKey,
    decision: input.decision,
    reason: input.reason,
    metadata: input.metadata ?? {},
  } as never);
}

export async function logRejectedDraft(
  draft: SeoActionDraft,
  reason: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await fromAutonomous("seo_actions").upsert(
    {
      external_key: draft.external_key,
      action_type: draft.action_type,
      article_id: draft.article_id,
      article_slug: draft.article_slug,
      field_key: draft.field_key,
      current_value: draft.current_value,
      suggested_value: draft.suggested_value,
      reason: draft.reason,
      confidence: draft.confidence,
      expected_impact: draft.expected_impact,
      rollback_strategy: draft.rollback_strategy,
      policy_status: "rejected",
      status: "skipped",
      metadata: { rejection_reason: reason, ...(draft.metadata ?? {}) },
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "external_key" }
  );

  await logPolicyDecision({
    fieldKey: draft.field_key,
    decision: "rejected",
    reason,
  });
}

export async function listPendingActions(limit = 50): Promise<SeoAction[]> {
  if (!isSupabaseConfigured()) return [];

  const { data } = await fromAutonomous("seo_actions")
    .select("*")
    .eq("status", "pending")
    .eq("policy_status", "allowed")
    .order("confidence", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => mapAction(row as Record<string, unknown>));
}

export async function getActionById(id: string): Promise<SeoAction | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await fromAutonomous("seo_actions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return mapAction(data as Record<string, unknown>);
}

export async function updateActionStatus(
  id: string,
  status: SeoAction["status"],
  extra?: {
    execution_history_id?: string | null;
    error_message?: string;
    retries?: number;
  }
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "succeeded" || status === "failed") {
    patch.executed_at = new Date().toISOString();
  }
  if (extra?.execution_history_id !== undefined) {
    patch.execution_history_id = extra.execution_history_id;
  }
  if (extra?.error_message) patch.error_message = extra.error_message;
  if (extra?.retries !== undefined) patch.retries = extra.retries;

  await fromAutonomous("seo_actions").update(patch as never).eq("id", id);
}

export async function saveActionResults(
  actionId: string,
  metrics: Array<{
    metric_type: MetricType;
    baseline_value: number | null;
    current_value: number | null;
    delta: number | null;
  }>
): Promise<void> {
  if (!isSupabaseConfigured() || metrics.length === 0) return;

  await fromAutonomous("seo_action_results").insert(
    metrics.map((m) => ({
      action_id: actionId,
      metric_type: m.metric_type,
      baseline_value: m.baseline_value,
      current_value: m.current_value,
      delta: m.delta,
    })) as never
  );
}

export async function getAutonomousDashboard(): Promise<AutonomousDashboard> {
  if (!isSupabaseConfigured()) {
    return {
      pipelineHealth: "offline",
      actionsExecuted: 0,
      successRate: 0,
      failures: 0,
      learningProgress: 0,
      trafficGain: 0,
      ctrGain: 0,
      rankingGain: 0,
      rollbackCount: 0,
      recentActions: [],
      stageHealth: {
        observe: "idle",
        analyze: "idle",
        generate: "idle",
        policy: "idle",
        execute: "idle",
        verify: "idle",
        measure: "idle",
        learn: "idle",
      },
    };
  }

  const supabase = createAdminServerClient();

  const [actionsRes, learningRes, resultsRes, recentRes] = await Promise.all([
    supabase.from("seo_actions" as never).select("status", { count: "exact" }),
    supabase.from("seo_learning" as never).select("sample_count, outcome_score"),
    supabase.from("seo_action_results" as never).select("metric_type, delta, current_value"),
    supabase
      .from("seo_actions" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const allActions = (actionsRes.data ?? []) as Array<{ status: string }>;
  const succeeded = allActions.filter((a) => a.status === "succeeded").length;
  const failed = allActions.filter((a) => a.status === "failed").length;
  const executed = allActions.filter(
    (a) => a.status === "succeeded" || a.status === "failed"
  ).length;
  const rolledBack = allActions.filter((a) => a.status === "rolled_back").length;

  const learning = (learningRes.data ?? []) as Array<{
    sample_count: number;
    outcome_score: number;
  }>;
  const learningProgress =
    learning.length > 0
      ? learning.reduce((s, l) => s + l.sample_count, 0) /
        Math.max(learning.length, 1)
      : 0;

  const results = (resultsRes.data ?? []) as Array<{
    metric_type: string;
    delta: number | null;
    current_value: number | null;
  }>;

  let ctrGain = 0;
  let trafficGain = 0;
  let rankingGain = 0;
  for (const r of results) {
    if (r.metric_type === "ctr" && r.delta) ctrGain += r.delta;
    if (r.metric_type === "impressions" && r.delta) trafficGain += r.delta;
    if ((r.metric_type === "position" || r.metric_type === "ranking") && r.delta) {
      rankingGain += -r.delta;
    }
  }

  const successRate = executed > 0 ? (succeeded / executed) * 100 : 0;
  const pipelineHealth: AutonomousDashboard["pipelineHealth"] =
  failed > succeeded && executed > 5
    ? "degraded"
    : executed > 0
      ? "healthy"
      : "healthy";

  return {
    pipelineHealth,
    actionsExecuted: executed,
    successRate: Math.round(successRate * 10) / 10,
    failures: failed,
    learningProgress: Math.round(learningProgress),
    trafficGain: Math.round(trafficGain),
    ctrGain: Math.round(ctrGain * 1000) / 1000,
    rankingGain: Math.round(rankingGain * 10) / 10,
    rollbackCount: rolledBack,
    recentActions: (recentRes.data ?? []).map((row) =>
      mapAction(row as Record<string, unknown>)
    ),
    stageHealth: {
      observe: "ok",
      analyze: "ok",
      generate: "ok",
      policy: "ok",
      execute: executed > 0 ? "ok" : "idle",
      verify: succeeded > 0 ? "ok" : "idle",
      measure: results.length > 0 ? "ok" : "idle",
      learn: learning.length > 0 ? "ok" : "idle",
    },
  };
}
