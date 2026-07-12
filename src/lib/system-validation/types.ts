/**
 * System Validation Engine — shared types
 */

export type ValidationStatus = "pass" | "warn" | "fail" | "skip";

export type HealthCategory =
  | "overall"
  | "database"
  | "infrastructure"
  | "ai"
  | "seo"
  | "publishing"
  | "indexing"
  | "performance"
  | "security"
  | "scheduler";

export type ValidationModuleResult = {
  moduleId: string;
  label: string;
  category: HealthCategory;
  status: ValidationStatus;
  message?: string;
  details?: Record<string, unknown>;
  latencyMs: number;
};

export type CategoryHealthScore = {
  category: HealthCategory;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  pass: number;
  warn: number;
  fail: number;
  skip: number;
};

export type SystemHealthScores = {
  overall: CategoryHealthScore;
  database: CategoryHealthScore;
  infrastructure: CategoryHealthScore;
  ai: CategoryHealthScore;
  seo: CategoryHealthScore;
  publishing: CategoryHealthScore;
  indexing: CategoryHealthScore;
  performance: CategoryHealthScore;
  security: CategoryHealthScore;
  scheduler: CategoryHealthScore;
};

export type RecoveryAction = {
  id: string;
  actionType: string;
  target: string | null;
  status: "attempted" | "succeeded" | "failed" | "skipped";
  message: string | null;
  createdAt: string;
};

export type ValidationRunSummary = {
  id: string;
  runType: string;
  status: string;
  overallScore: number;
  overallGrade: string;
  productionReady: boolean;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  moduleCount: number;
  passCount: number;
  warnCount: number;
  failCount: number;
};

export type SystemDashboard = {
  enabled: boolean;
  health: SystemHealthScores;
  modules: ValidationModuleResult[];
  warnings: string[];
  errors: string[];
  runningJobs: Array<{ id: string; label: string; status: string }>;
  failedJobs: Array<{ id: string; label: string; detail: string }>;
  recoveryActions: RecoveryAction[];
  deploymentStatus: "ready" | "degraded" | "blocked";
  lastRun: ValidationRunSummary | null;
  cron: {
    staleJobs: string[];
    recentJobs: Array<{ job: string; ok: boolean; at: string }>;
  };
  timestamp: string;
};

export type ValidationReport = {
  ok: boolean;
  runId: string;
  status: "completed" | "partial" | "failed";
  health: SystemHealthScores;
  modules: ValidationModuleResult[];
  productionReadiness: {
    ready: boolean;
    blockers: string[];
    warnings: string[];
    checklist: Array<{ item: string; status: ValidationStatus }>;
  };
  recoveryActions: RecoveryAction[];
  durationMs: number;
};
