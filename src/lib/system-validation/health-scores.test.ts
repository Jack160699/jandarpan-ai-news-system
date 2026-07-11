import { describe, expect, it } from "vitest";
import { computeHealthScores, deriveDeploymentStatus } from "@/lib/system-validation/health-scores";
import type { ValidationModuleResult } from "@/lib/system-validation/types";

function mod(
  id: string,
  category: ValidationModuleResult["category"],
  status: ValidationModuleResult["status"]
): ValidationModuleResult {
  return {
    moduleId: id,
    label: id,
    category,
    status,
    latencyMs: 0,
  };
}

describe("health-scores", () => {
  it("computes category scores from module results", () => {
    const modules: ValidationModuleResult[] = [
      mod("supabase", "database", "pass"),
      mod("redis", "infrastructure", "pass"),
      mod("seo", "seo", "warn"),
      mod("cron", "scheduler", "fail"),
    ];
    const health = computeHealthScores(modules);
    expect(health.database.score).toBe(100);
    expect(health.scheduler.score).toBe(0);
    expect(health.overall.score).toBeGreaterThan(0);
  });

  it("derives deployment status from blockers", () => {
    const modules = [mod("x", "database", "fail")];
    const health = computeHealthScores(modules);
    expect(deriveDeploymentStatus(health, ["db down"])).toBe("blocked");
    expect(deriveDeploymentStatus(health, [])).toBe("blocked");
  });
});
