/**
 * Phase 8 — tenant-id hygiene for worker_jobs enqueue / repair.
 */

import type { JobType } from "@/lib/infrastructure/jobs/types";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";

/** Job types that must never be enqueued without a resolvable tenant. */
export const TENANT_REQUIRED_JOB_TYPES: ReadonlySet<JobType> = new Set([
  "editorial_generate",
  "translate_article",
  "translation_batch",
  "intelligence_snapshot",
  "intelligence_cluster",
  "intelligence_summary",
  "seo_analysis",
  "analytics_aggregate",
  "dam_analyze",
  "event_cluster",
  "embed_articles",
  "embed_signals",
]);

export type ResolveTenantIdResult =
  | { ok: true; tenantId: string; resolvedFrom: "input" | "pipeline_default" }
  | { ok: false; reason: "missing_tenant"; jobType: JobType };

/**
 * Resolve tenant for enqueue. Required job types fall back to pipeline default
 * only when `allowPipelineFallback` is true (default). Callers may reject instead.
 */
export function resolveJobTenantId(
  jobType: JobType,
  tenantId: string | null | undefined,
  options?: { allowPipelineFallback?: boolean; requireTenant?: boolean }
): ResolveTenantIdResult {
  const trimmed = tenantId?.trim() || null;
  if (trimmed) {
    return { ok: true, tenantId: trimmed, resolvedFrom: "input" };
  }

  const requireTenant =
    options?.requireTenant ?? TENANT_REQUIRED_JOB_TYPES.has(jobType);
  const allowFallback = options?.allowPipelineFallback ?? true;

  if (requireTenant && allowFallback) {
    return {
      ok: true,
      tenantId: getPipelineTenantId(),
      resolvedFrom: "pipeline_default",
    };
  }

  if (requireTenant) {
    return { ok: false, reason: "missing_tenant", jobType };
  }

  // Optional jobs may still prefer a default for cache/isolation consistency.
  return {
    ok: true,
    tenantId: getPipelineTenantId(),
    resolvedFrom: "pipeline_default",
  };
}

/** Reject enqueue when tenant cannot be resolved (strict mode). */
export function assertJobTenantId(
  jobType: JobType,
  tenantId: string | null | undefined
): string {
  const resolved = resolveJobTenantId(jobType, tenantId, {
    allowPipelineFallback: true,
  });
  if (!resolved.ok) {
    throw new Error(`missing_tenant:${jobType}`);
  }
  return resolved.tenantId;
}
