"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";
import {
  Av3EmptyState,
  Av3HealthRow,
  Av3Hero,
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3ReasonList,
  Av3Skeleton,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
} from "@/components/admin-v3";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function PlatformOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<ReturnType<typeof deriveCanonicalHealth> | null>(null);
  const [checks, setChecks] = useState<
    Array<{ id: string; label: string; status: string; latencyMs: number }>
  >([]);
  const [queuePending, setQueuePending] = useState<number | null>(null);
  const [redisConnected, setRedisConnected] = useState<boolean | null>(null);
  const [stabilityScore, setStabilityScore] = useState<number | null>(null);
  const [errors24h, setErrors24h] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Summary-first — same canonical service as header / health page.
        const res = await fetch("/api/admin/ops/health-summary", {
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setError("Platform health API unavailable for this session.");
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        const snap =
          json.snapshot ??
          deriveCanonicalHealth({
            status: json.status,
            checks: json.checks,
            cron: json.cron,
            timestamp: json.checkedAt,
          });
        setSnapshot(snap);

        const checkList = Array.isArray(json.checks) ? json.checks : [];
        setChecks(
          checkList.slice(0, 6).map((raw: Record<string, unknown>) => ({
            id: String(raw.id ?? raw.label),
            label: String(raw.label ?? raw.id ?? "Check"),
            status: String(raw.status ?? "unknown"),
            latencyMs: Number(raw.latencyMs ?? 0),
          }))
        );

        const metrics = asRecord(json.metrics);
        const queues = asRecord(metrics.queues);
        const aiPending = Number(queues.aiPending ?? NaN);
        const editorialPending = Number(queues.editorialImagesPending ?? NaN);
        if (Number.isFinite(aiPending) && Number.isFinite(editorialPending)) {
          setQueuePending(aiPending + editorialPending);
        } else if (Number.isFinite(aiPending)) {
          setQueuePending(aiPending);
        }

        const redisSource = Array.isArray(json.sources)
          ? json.sources.find(
              (s: { source?: string }) =>
                String(s.source).includes("redis")
            )
          : null;
        setRedisConnected(redisSource ? Boolean(redisSource.ok) : null);
        setStabilityScore(
          Number(snap.score ?? asRecord(json.stability).score) || null
        );
        setErrors24h(null);
      } catch {
        if (!cancelled) setError("Unable to load platform health.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Av3Stack>
        <Av3Skeleton className="av3-skeleton--block" style={{ minHeight: 88 }} />
        <Av3SkeletonGrid count={4} />
      </Av3Stack>
    );
  }

  if (error || !snapshot) {
    return (
      <Av3EmptyState
        title={error ?? "Health data unavailable"}
        message="Retry from Health details if you have monitoring access."
        action={
          <Link href="/admin/health" className="anr-text-link">
            Open health details
          </Link>
        }
      />
    );
  }

  return (
    <Av3Stack>
      <Av3Hero
        tone={snapshot.state}
        badge={<Av3StatusBadge tone={snapshot.state} label={snapshot.label} />}
        title={
          snapshot.score != null
            ? `Stability ${snapshot.score}/100${snapshot.grade ? ` · ${snapshot.grade}` : ""}`
            : "Platform overview"
        }
        meta={`Updated ${new Date(snapshot.checkedAt).toLocaleString()}`}
        action={
          <Link href="/admin/health" className="anr-btn anr-btn--primary">
            Health details
          </Link>
        }
      />

      <Av3ReasonList reasons={snapshot.reasons} />

      <Av3MetricGrid>
        <Av3Metric label="Stability score" value={stabilityScore ?? "—"} hint="Production readiness" />
        <Av3Metric label="Errors (24h)" value={errors24h ?? "—"} hint="Tracked ops events" />
        <Av3Metric label="Queue pending" value={queuePending ?? "—"} hint="AI + editorial backlog" />
        <Av3Metric
          label="Redis cache"
          value={redisConnected == null ? "—" : redisConnected ? "Connected" : "Off"}
          hint="Dashboard cache layer"
        />
      </Av3MetricGrid>

      <Av3Panel title="Service summary" subtitle="Latest health checks">
        {checks.length === 0 ? (
          <p className="av3-note">No health checks returned.</p>
        ) : (
          <ul className="av3-health-list">
            {checks.map((check) => (
              <Av3HealthRow
                key={check.id}
                label={check.label}
                status={check.status}
                latencyMs={check.latencyMs}
              />
            ))}
          </ul>
        )}
      </Av3Panel>
    </Av3Stack>
  );
}
