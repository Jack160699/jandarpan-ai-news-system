/**
 * Shared admin metric / data contract foundation.
 * Phase 1: used by overview/daily, system-status, health-summary.
 */

export type MetricFreshness = "live" | "fresh" | "stale" | "unavailable";

export type MetricAvailability =
  | "available"
  | "partial"
  | "unavailable"
  | "forbidden"
  | "not_configured";

export type MetricComparison = {
  value: number | string | null;
  period: string;
  label?: string;
};

export type AdminMetric<T = number | string | null> = {
  value: T;
  unit?: string;
  source: string;
  period?: string;
  generatedAt: string;
  lastSuccessfulAt?: string | null;
  freshness: MetricFreshness;
  comparison?: MetricComparison | null;
  availability: MetricAvailability;
  confidence?: "high" | "medium" | "low";
};

export type AdminMetricEnvelope = {
  generatedAt: string;
  freshness: MetricFreshness;
  availability: MetricAvailability;
};

export function metricFreshnessFromAge(
  generatedAtIso: string | null | undefined,
  opts?: { freshMs?: number; staleMs?: number }
): MetricFreshness {
  if (!generatedAtIso) return "unavailable";
  const ts = Date.parse(generatedAtIso);
  if (!Number.isFinite(ts)) return "unavailable";
  const age = Date.now() - ts;
  const freshMs = opts?.freshMs ?? 60_000;
  const staleMs = opts?.staleMs ?? 5 * 60_000;
  if (age <= freshMs) return "live";
  if (age <= staleMs) return "fresh";
  return "stale";
}

export function buildAdminMetric<T>(
  value: T,
  opts: {
    source: string;
    unit?: string;
    period?: string;
    generatedAt?: string;
    lastSuccessfulAt?: string | null;
    freshness?: MetricFreshness;
    availability?: MetricAvailability;
    comparison?: MetricComparison | null;
    confidence?: "high" | "medium" | "low";
    ok?: boolean;
  }
): AdminMetric<T> {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  const availability: MetricAvailability =
    opts.availability ??
    (opts.ok === false ? "unavailable" : "available");
  const freshness =
    opts.freshness ??
    (availability === "unavailable" || availability === "forbidden"
      ? "unavailable"
      : metricFreshnessFromAge(generatedAt));

  return {
    value,
    unit: opts.unit,
    source: opts.source,
    period: opts.period,
    generatedAt,
    lastSuccessfulAt:
      opts.lastSuccessfulAt === undefined
        ? availability === "available" || availability === "partial"
          ? generatedAt
          : null
        : opts.lastSuccessfulAt,
    freshness,
    comparison: opts.comparison ?? null,
    availability,
    confidence: opts.confidence,
  };
}

export function buildEnvelope(opts: {
  ok: boolean;
  generatedAt?: string;
  stale?: boolean;
  forbidden?: boolean;
}): AdminMetricEnvelope {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  if (opts.forbidden) {
    return {
      generatedAt,
      freshness: "unavailable",
      availability: "forbidden",
    };
  }
  if (!opts.ok) {
    return {
      generatedAt,
      freshness: "unavailable",
      availability: "unavailable",
    };
  }
  return {
    generatedAt,
    freshness: opts.stale ? "stale" : "live",
    availability: opts.stale ? "partial" : "available",
  };
}
