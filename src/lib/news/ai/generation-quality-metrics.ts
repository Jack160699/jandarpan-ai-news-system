/**
 * Phase 5 — in-process generation quality metrics (logged + returned to callers).
 */

import type { GeneratedArticleValidationResult } from "@/lib/news/ai/generated-article-validation";

export type GenerationQualityMetrics = {
  attempted: number;
  validationPassed: number;
  validationFailed: number;
  titleFailure: number;
  bodyFailure: number;
  missingSource: number;
  duplicateRejection: number;
  languageFailure: number;
  retries: number;
  quarantined: number;
  manualReview: number;
};

export function createGenerationQualityMetrics(): GenerationQualityMetrics {
  return {
    attempted: 0,
    validationPassed: 0,
    validationFailed: 0,
    titleFailure: 0,
    bodyFailure: 0,
    missingSource: 0,
    duplicateRejection: 0,
    languageFailure: 0,
    retries: 0,
    quarantined: 0,
    manualReview: 0,
  };
}

export function recordValidationOutcome(
  metrics: GenerationQualityMetrics,
  validation: GeneratedArticleValidationResult,
  options?: { retried?: boolean; quarantined?: boolean; manualReview?: boolean }
): void {
  metrics.attempted += 1;
  if (validation.ok) {
    metrics.validationPassed += 1;
    return;
  }
  metrics.validationFailed += 1;
  if (validation.metrics.titleFailure) metrics.titleFailure += 1;
  if (validation.metrics.bodyFailure) metrics.bodyFailure += 1;
  if (validation.metrics.missingSource) metrics.missingSource += 1;
  if (validation.metrics.duplicateRejection) metrics.duplicateRejection += 1;
  if (validation.metrics.languageFailure) metrics.languageFailure += 1;
  if (options?.retried) metrics.retries += 1;
  if (options?.quarantined) metrics.quarantined += 1;
  if (options?.manualReview) metrics.manualReview += 1;
}

export function validationPassRate(metrics: GenerationQualityMetrics): number {
  if (metrics.attempted === 0) return 100;
  return Math.round((metrics.validationPassed / metrics.attempted) * 1000) / 10;
}

export function logGenerationQualityMetrics(
  metrics: GenerationQualityMetrics,
  context?: Record<string, unknown>
): void {
  console.log(
    "[GENERATION_QUALITY]",
    JSON.stringify({
      type: "GENERATION_QUALITY_METRICS",
      passRate: validationPassRate(metrics),
      ...metrics,
      ...context,
      ts: new Date().toISOString(),
    })
  );
}

/** Raise an incident only after repeated structural failures in a batch. */
export function shouldRaiseGenerationQualityIncident(
  metrics: GenerationQualityMetrics
): boolean {
  return (
    metrics.validationFailed >= 3 ||
    metrics.quarantined >= 2 ||
    (metrics.attempted >= 5 && validationPassRate(metrics) < 40)
  );
}
