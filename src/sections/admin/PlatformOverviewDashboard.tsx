"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";
import {
  ADMIN_FETCH_DEFAULTS,
  adminGet,
  type PartialSectionState,
} from "@/lib/admin-v3/admin-fetch";
import {
  peekSharedCanonicalStatus,
  seedSharedCanonicalStatus,
} from "@/hooks/useCanonicalStatus";
import {
  Av3Disclosure,
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

type Snapshot = ReturnType<typeof deriveCanonicalHealth> & {
  usedLastKnown?: boolean;
  freshness?: string;
};

export function PlatformOverviewDashboard() {
  const shared = peekSharedCanonicalStatus();
  const [sectionState, setSectionState] = useState<PartialSectionState>(
    shared ? "stale" : "loading"
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(
    () => (shared as Snapshot | null) ?? null
  );
  const [checks, setChecks] = useState<
    Array<{ id: string; label: string; status: string; latencyMs: number }>
  >([]);
  const [queuePending, setQueuePending] = useState<number | null>(null);
  const [redisConnected, setRedisConnected] = useState<boolean | null>(null);
  const [stabilityScore, setStabilityScore] = useState<number | null>(
    () => (shared?.score != null ? Number(shared.score) : null)
  );
  const [error, setError] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagNote, setDiagNote] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSectionState((prev) => (prev === "loaded" || prev === "stale" ? prev : "loading"));
    setError(null);
    const result = await adminGet<{
      status?: string;
      checks?: unknown[];
      cron?: unknown;
      checkedAt?: string;
      snapshot?: Snapshot;
      metrics?: Record<string, unknown>;
      sources?: Array<{ source?: string; ok?: boolean }>;
      stale?: boolean;
    }>("/api/admin/ops/health-summary", {
      timeoutMs: ADMIN_FETCH_DEFAULTS.summaryTimeoutMs,
      label: "technical-home-summary",
    });

    if (!result.ok) {
      if (result.timedOut) {
        setError("Summary timed out — showing last-known if available.");
        setSectionState((prev) => (prev === "loaded" || prev === "stale" ? "stale" : "timeout"));
      } else {
        setError("Platform summary unavailable for this session.");
        setSectionState((prev) =>
          prev === "loaded" || prev === "stale" ? "stale" : "unavailable"
        );
      }
      return;
    }

    const json = result.data;
    const snap =
      (json.snapshot as Snapshot | undefined) ??
      deriveCanonicalHealth({
        status: json.status,
        checks: json.checks,
        cron: json.cron,
        timestamp: json.checkedAt,
      });
    setSnapshot(snap);
    seedSharedCanonicalStatus(snap);

    const checkList = Array.isArray(json.checks) ? json.checks : [];
    setChecks(
      checkList.slice(0, 8).map((value) => {
        const raw = asRecord(value);
        return {
          id: String(raw.id ?? raw.label),
          label: String(raw.label ?? raw.id ?? "Check"),
          status: String(raw.status ?? "unknown"),
          latencyMs: Number(raw.latencyMs ?? 0),
        };
      })
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
      ? json.sources.find((s) => String(s.source).includes("redis"))
      : null;
    setRedisConnected(redisSource ? Boolean(redisSource.ok) : null);
    setStabilityScore(Number(snap.score ?? NaN) || null);
    const snapExt = snap as Snapshot;
    setSectionState(
      json.stale || snapExt.usedLastKnown || snapExt.freshness === "stale"
        ? "stale"
        : "loaded"
    );
  }, []);

  const loadDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    setDiagError(null);
    const result = await adminGet<{
      snapshot?: { state?: string };
    }>("/api/admin/ops/health", {
      timeoutMs: ADMIN_FETCH_DEFAULTS.diagnosticsTimeoutMs,
      label: "technical-home-diagnostics",
      skipDedupe: true,
    });
    if (!result.ok) {
      setDiagError(
        result.timedOut ? "Diagnostics timed out." : "Diagnostics unavailable."
      );
      setDiagLoading(false);
      return;
    }
    const json = result.data;
    if (json.snapshot?.state) {
      setDiagNote(
        `Diagnostics overall state: ${json.snapshot.state} (same model as summary).`
      );
    } else {
      setDiagNote("Diagnostics loaded. Open Health details for full matrix.");
    }
    setDiagLoading(false);
  }, []);

  useEffect(() => {
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  if (sectionState === "loading" && !snapshot) {
    return (
      <Av3Stack>
        <Av3Skeleton className="av3-skeleton--block" style={{ minHeight: 88 }} />
        <Av3SkeletonGrid count={4} />
      </Av3Stack>
    );
  }

  if (!snapshot) {
    return (
      <Av3EmptyState
        title={error ?? "Health data unavailable"}
        message="Retry summary, or open Health details if you have monitoring access."
        action={
          <div className="av3-stack-inline">
            <button
              type="button"
              className="av3-btn av3-btn--ghost"
              onClick={() => void loadSummary()}
            >
              Retry summary
            </button>
            <Link href="/admin/health" className="av3-panel-link">
              Open health details
            </Link>
          </div>
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
        meta={
          `${sectionState === "stale" ? "Stale · " : ""}Updated ${new Date(snapshot.checkedAt).toLocaleString()}`
        }
        action={
          <Link href="/admin/health" className="av3-btn av3-btn--primary">
            Health details
          </Link>
        }
      />

      {error ? <p className="av3-note av3-note--warn">{error}</p> : null}

      <Av3ReasonList reasons={snapshot.reasons} />

      <Av3MetricGrid>
        <Av3Metric
          label="Stability score"
          value={stabilityScore ?? "—"}
          hint="From canonical summary"
        />
        <Av3Metric
          label="Critical"
          value={snapshot.criticalCount ?? 0}
          hint="Active incidents"
        />
        <Av3Metric
          label="Queue pending"
          value={queuePending ?? "—"}
          hint="AI + editorial backlog"
        />
        <Av3Metric
          label="Redis cache"
          value={
            redisConnected == null ? "—" : redisConnected ? "Connected" : "Off"
          }
          hint="Dashboard cache layer"
        />
      </Av3MetricGrid>

      <Av3Panel title="Service summary" subtitle="Lightweight probes">
        {checks.length === 0 ? (
          <p className="av3-note">Service matrix loading or unavailable.</p>
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

      <Av3Disclosure
        title="View diagnostics"
        onOpenChange={(open) => {
          if (open && !diagNote && !diagLoading) void loadDiagnostics();
        }}
      >
        {diagLoading ? <p className="av3-note">Loading diagnostics…</p> : null}
        {diagError ? <p className="av3-note av3-note--warn">{diagError}</p> : null}
        {diagNote ? <p className="av3-note">{diagNote}</p> : null}
        <Link href="/admin/health" className="av3-panel-link">
          Open full Platform health
        </Link>
      </Av3Disclosure>
    </Av3Stack>
  );
}
