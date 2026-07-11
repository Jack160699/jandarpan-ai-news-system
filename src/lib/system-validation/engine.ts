/**
 * System Validation Engine — orchestrator
 */

import { getCronMonitorState } from "@/lib/observability/cron-monitor";
import { getQueueAnalyticsDashboard } from "@/lib/observability/queue-analytics";
import { validateSubsystems } from "@/lib/system-validation/subsystem-validators";
import { validateSeoSurface } from "@/lib/system-validation/seo-surface";
import { validateAutomatedChecks } from "@/lib/system-validation/automated-checks";
import {
  computeHealthScores,
  deriveDeploymentStatus,
} from "@/lib/system-validation/health-scores";
import { runSelfHealing } from "@/lib/system-validation/self-healing";
import {
  completeValidationRun,
  createValidationRun,
  getLastValidationRun,
  getRecentRecoveryActions,
  saveRecoveryActions,
  saveValidationResults,
} from "@/lib/system-validation/repository";
import { isSystemValidationEnabled } from "@/lib/system-validation/config";
import { logValidation } from "@/lib/system-validation/logger";
import type {
  SystemDashboard,
  ValidationModuleResult,
  ValidationReport,
  ValidationStatus,
} from "@/lib/system-validation/types";

function dedupeModules(modules: ValidationModuleResult[]): ValidationModuleResult[] {
  const seen = new Map<string, ValidationModuleResult>();
  for (const m of modules) {
    const existing = seen.get(m.moduleId);
    if (!existing || m.status === "fail" || (m.status === "warn" && existing.status === "pass")) {
      seen.set(m.moduleId, m);
    }
  }
  return [...seen.values()];
}

function buildProductionReadiness(
  modules: ValidationModuleResult[],
  health: ReturnType<typeof computeHealthScores>
) {
  const blockers = modules
    .filter((m) => m.status === "fail")
    .map((m) => `${m.label}: ${m.message ?? "failed"}`);

  const warnings = modules
    .filter((m) => m.status === "warn")
    .map((m) => `${m.label}: ${m.message ?? "warning"}`);

  const checklist: Array<{ item: string; status: ValidationStatus }> = [
    { item: "Overall health score ≥ 70", status: health.overall.score >= 70 ? "pass" : "fail" },
    { item: "No critical failures", status: health.overall.fail === 0 ? "pass" : "fail" },
    { item: "Database healthy", status: health.database.score >= 60 ? "pass" : "warn" },
    { item: "Scheduler healthy", status: health.scheduler.score >= 60 ? "pass" : "warn" },
    { item: "SEO surface valid", status: health.seo.score >= 60 ? "pass" : "warn" },
    { item: "Security env valid", status: health.security.score >= 60 ? "pass" : "warn" },
    { item: "Production build present", status: modules.find((m) => m.moduleId === "build")?.status === "pass" ? "pass" : "warn" },
  ];

  const ready =
    blockers.length === 0 &&
    health.overall.score >= 70 &&
    checklist.filter((c) => c.status === "fail").length === 0;

  return { ready, blockers, warnings, checklist };
}

export async function loadSystemDashboard(): Promise<SystemDashboard> {
  const [subsystem, seo, automated, cron, queueAnalytics, lastRun, recoveryActions] =
    await Promise.all([
      validateSubsystems(),
      validateSeoSurface(),
      validateAutomatedChecks(),
      getCronMonitorState().catch(() => ({ jobs: [], staleJobs: [] })),
      getQueueAnalyticsDashboard().catch(() => null),
      getLastValidationRun(),
      getRecentRecoveryActions(15),
    ]);

  const modules = dedupeModules([...subsystem, ...seo, ...automated]);
  const health = computeHealthScores(modules);
  const readiness = buildProductionReadiness(modules, health);

  const warnings = modules.filter((m) => m.status === "warn").map((m) => m.message ?? m.label);
  const errors = modules.filter((m) => m.status === "fail").map((m) => m.message ?? m.label);

  const runningJobs: SystemDashboard["runningJobs"] = [];
  const failedJobs: SystemDashboard["failedJobs"] = [];

  if (queueAnalytics) {
    if (queueAnalytics.ai.pending > 0) {
      runningJobs.push({
        id: "ai_queue",
        label: "AI enrichment queue",
        status: `${queueAnalytics.ai.pending} pending`,
      });
    }
    if (queueAnalytics.editorial.pending > 0) {
      runningJobs.push({
        id: "editorial_queue",
        label: "Editorial queue",
        status: `${queueAnalytics.editorial.pending} pending`,
      });
    }
    const dead = queueAnalytics.ai.dead + queueAnalytics.editorial.deadJobs;
    if (dead > 0) {
      failedJobs.push({
        id: "dead_jobs",
        label: "Dead worker jobs",
        detail: `${dead} dead`,
      });
    }
  }

  for (const job of cron.staleJobs ?? []) {
    failedJobs.push({ id: job, label: `Stale cron: ${job}`, detail: "No recent heartbeat" });
  }

  return {
    enabled: isSystemValidationEnabled(),
    health,
    modules,
    warnings,
    errors,
    runningJobs,
    failedJobs,
    recoveryActions,
    deploymentStatus: deriveDeploymentStatus(health, readiness.blockers),
    lastRun,
    cron: {
      staleJobs: cron.staleJobs ?? [],
      recentJobs: (cron.jobs ?? []).slice(0, 8).map((j) => ({
        job: j.job,
        ok: j.ok,
        at: j.startedAt,
      })),
    },
    timestamp: new Date().toISOString(),
  };
}

export async function runFullValidation(input: {
  runType?: string;
  triggeredBy?: string;
  selfHeal?: boolean;
} = {}): Promise<ValidationReport> {
  const startedAt = Date.now();
  const runId = await createValidationRun({
    runType: input.runType ?? "full",
    triggeredBy: input.triggeredBy,
  });

  logValidation("validation_started", { runId, runType: input.runType });

  const [subsystem, seo, automated] = await Promise.all([
    validateSubsystems().catch(() => [] as ValidationModuleResult[]),
    validateSeoSurface().catch(() => [] as ValidationModuleResult[]),
    validateAutomatedChecks().catch(() => [] as ValidationModuleResult[]),
  ]);

  const modules = dedupeModules([...subsystem, ...seo, ...automated]);
  const health = computeHealthScores(modules);
  const productionReadiness = buildProductionReadiness(modules, health);

  let recoveryActions: Awaited<ReturnType<typeof saveRecoveryActions>> = [];
  if (input.selfHeal !== false) {
    const attempts = await runSelfHealing(modules, runId ?? undefined);
    recoveryActions = await saveRecoveryActions(runId, attempts);
  }

  const durationMs = Date.now() - startedAt;
  const status =
    productionReadiness.blockers.length > 0
      ? "partial"
      : health.overall.fail > 0
        ? "partial"
        : "completed";

  if (runId) {
    await saveValidationResults(runId, modules);
    await completeValidationRun({
      runId,
      status,
      health,
      productionReady: productionReadiness.ready,
      durationMs,
      summary: {
        moduleCount: modules.length,
        passCount: modules.filter((m) => m.status === "pass").length,
        warnCount: modules.filter((m) => m.status === "warn").length,
        failCount: modules.filter((m) => m.status === "fail").length,
        blockers: productionReadiness.blockers,
      },
    });
  }

  logValidation("validation_complete", {
    runId,
    score: health.overall.score,
    ready: productionReadiness.ready,
    durationMs,
  });

  return {
    ok: productionReadiness.blockers.length === 0,
    runId: runId ?? "local",
    status,
    health,
    modules,
    productionReadiness,
    recoveryActions,
    durationMs,
  };
}
