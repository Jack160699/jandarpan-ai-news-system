/**
 * Autonomous SEO Engine — shared types
 */

export type ActionStatus =
  | "pending"
  | "executing"
  | "succeeded"
  | "failed"
  | "rolled_back"
  | "skipped";

export type PolicyDecision = "allowed" | "rejected";

export type MetricType =
  | "ctr"
  | "impressions"
  | "ranking"
  | "position"
  | "internal_links"
  | "schema_coverage";

export type PipelineStage =
  | "observe"
  | "analyze"
  | "generate"
  | "policy"
  | "execute"
  | "verify"
  | "measure"
  | "learn";

export interface SeoActionDraft {
  external_key: string;
  action_type: string;
  article_id: string;
  article_slug: string;
  field_key: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
  confidence: number;
  expected_impact: string;
  rollback_strategy: string;
  metadata?: Record<string, unknown>;
}

export interface SeoAction extends SeoActionDraft {
  id: string;
  status: ActionStatus;
  policy_status: PolicyDecision;
  execution_history_id: string | null;
  retries: number;
  error_message: string | null;
  created_at: string;
  executed_at: string | null;
}

export interface ObservationSnapshot {
  competitorArticles24h: number;
  serpOpportunities: number;
  gscOpenRecommendations: number;
  executionPending: number;
  copilotRecommendations: number;
  gscPagesLowCtr: number;
  serpQuotaExhausted: boolean;
  serpIntelligenceMode: "hybrid" | "gsc_only";
  serpSearchesRemaining: number;
  errors: string[];
}

export interface AnalysisOpportunity {
  article_id: string;
  article_slug: string;
  opportunity_type: string;
  score: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface StageResult {
  stage: PipelineStage;
  ok: boolean;
  durationMs: number;
  count?: number;
  errors: string[];
}

export interface PipelineRunResult {
  ok: boolean;
  status: "completed" | "skipped" | "partial";
  skippedReason?: string;
  stages: StageResult[];
  actionsGenerated: number;
  actionsAllowed: number;
  actionsExecuted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  errors: string[];
}

export interface AutonomousDashboard {
  pipelineHealth: "healthy" | "degraded" | "offline";
  actionsExecuted: number;
  successRate: number;
  failures: number;
  learningProgress: number;
  trafficGain: number;
  ctrGain: number;
  rankingGain: number;
  rollbackCount: number;
  recentActions: SeoAction[];
  stageHealth: Record<PipelineStage, "ok" | "error" | "idle">;
}
