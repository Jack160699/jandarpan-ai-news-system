/**
 * Health score computation by category
 */

import type {
  CategoryHealthScore,
  HealthCategory,
  SystemHealthScores,
  ValidationModuleResult,
  ValidationStatus,
} from "@/lib/system-validation/types";

function statusPoints(status: ValidationStatus): number {
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  if (status === "skip") return 50;
  return 0;
}

function gradeFromScore(score: number): CategoryHealthScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

function scoreCategory(
  category: HealthCategory,
  modules: ValidationModuleResult[]
): CategoryHealthScore {
  const items = modules.filter((m) => m.category === category);
  const pass = items.filter((m) => m.status === "pass").length;
  const warn = items.filter((m) => m.status === "warn").length;
  const fail = items.filter((m) => m.status === "fail").length;
  const skip = items.filter((m) => m.status === "skip").length;

  const scored = items.filter((m) => m.status !== "skip");
  const score =
    scored.length === 0
      ? 50
      : Math.round(
          scored.reduce((s, m) => s + statusPoints(m.status), 0) / scored.length
        );

  return {
    category,
    score,
    grade: gradeFromScore(score),
    pass,
    warn,
    fail,
    skip,
  };
}

export function computeHealthScores(
  modules: ValidationModuleResult[]
): SystemHealthScores {
  const database = scoreCategory("database", modules);
  const infrastructure = scoreCategory("infrastructure", modules);
  const ai = scoreCategory("ai", modules);
  const seo = scoreCategory("seo", modules);
  const publishing = scoreCategory("publishing", modules);
  const indexing = scoreCategory("indexing", modules);
  const performance = scoreCategory("performance", modules);
  const security = scoreCategory("security", modules);
  const scheduler = scoreCategory("scheduler", modules);

  const categoryScores = [
    database,
    infrastructure,
    ai,
    seo,
    publishing,
    indexing,
    performance,
    security,
    scheduler,
  ];
  const overallScore = Math.round(
    categoryScores.reduce((s, c) => s + c.score, 0) / categoryScores.length
  );

  const overall: CategoryHealthScore = {
    category: "overall",
    score: overallScore,
    grade: gradeFromScore(overallScore),
    pass: modules.filter((m) => m.status === "pass").length,
    warn: modules.filter((m) => m.status === "warn").length,
    fail: modules.filter((m) => m.status === "fail").length,
    skip: modules.filter((m) => m.status === "skip").length,
  };

  return {
    overall,
    database,
    infrastructure,
    ai,
    seo,
    publishing,
    indexing,
    performance,
    security,
    scheduler,
  };
}

export function deriveDeploymentStatus(
  health: SystemHealthScores,
  blockers: string[]
): "ready" | "degraded" | "blocked" {
  if (blockers.length > 0 || health.overall.fail > 0) {
    return health.overall.score >= 55 ? "degraded" : "blocked";
  }
  if (health.overall.score < 70 || health.overall.warn > 3) return "degraded";
  return "ready";
}
