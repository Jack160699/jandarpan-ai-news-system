"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NewsroomHealthPanel } from "@/components/admin-newsroom/NewsroomHealthStrip";
import type { CanonicalHealthSnapshot } from "@/lib/admin-v3/canonical-health";
import { statusIntervalForState, isDocumentHidden } from "@/lib/admin-v3/admin-poll";
import {
  ADMIN_FETCH_DEFAULTS,
  adminGet,
} from "@/lib/admin-v3/admin-fetch";
import { peekSharedCanonicalStatus } from "@/hooks/useCanonicalStatus";
import {
  Av3Disclosure,
  Av3HealthRow,
  Av3Hero,
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3ReasonList,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
  truncateText,
} from "@/components/admin-v3";

type SourceTiming = {
  source: string;
  ok: boolean;
  ms: number;
  error?: string;
};

type SummaryPayload = {
  ok: boolean;
  mode: "summary";
  status: string;
  snapshot: CanonicalHealthSnapshot;
  checks: Array<{
    id: string;
    label: string;
    status: string;
    latencyMs: number;
    message?: string;
  }>;
  metrics: {
    memoryUsageMb: number;
    uptimeSec: number;
    queues: { aiPending?: number; editorialImagesPending?: number } | null;
  };
  cron: { jobs: Array<{ job: string; ok: boolean; startedAt: string }>; staleJobs: string[] };
  sources: SourceTiming[];
  failedSources: SourceTiming[];
  totalMs: number;
  checkedAt: string;
  stale?: boolean;
  error?: string;
};

type DiagnosticsPayload = {
  ok: boolean;
  status: string;
  timestamp?: string;
  stability: {
    score: number;
    grade: string;
    factors: Array<{ name: string; weight: number; score: number; note?: string }>;
  };
  checks: SummaryPayload["checks"];
  metrics: SummaryPayload["metrics"] & { memoryUsageMb: number; uptimeSec: number };
  cron: SummaryPayload["cron"];
  errors: { total: number; last24h: number; bySeverity: Record<string, number> };
  recentErrors: Array<{
    id: string;
    ts: string;
    severity: string;
    source: string;
    message: string;
  }>;
  caching: { redis: boolean };
  observability: { sentry: boolean };
  queueAnalytics?: {
    ai: { pending: number; dead: number; drainPerHour: number; eta: { etaLabel: string } };
    editorial: {
      pending: number;
      processing: number;
      drainPerHour: number;
      openAiSuccessRate: number;
      storageSuccessRate: number;
    };
    performance: { aiRecordsPerSec: number; editorialRecordsPerSec: number; bottleneck: string };
  };
};

const SUMMARY_TIMEOUT_MS = ADMIN_FETCH_DEFAULTS.summaryTimeoutMs;
const DIAG_TIMEOUT_MS = ADMIN_FETCH_DEFAULTS.diagnosticsTimeoutMs;
const CACHE_KEY = "jd-admin-health-summary-v2";

function readCache(): SummaryPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SummaryPayload;
  } catch {
    return null;
  }
}

function writeCache(payload: SummaryPayload) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

async function fetchJson<T>(
  url: string,
  timeoutMs: number,
  label: string
): Promise<{ data: T | null; error: string | null }> {
  const result = await adminGet<T & { ok?: boolean; error?: string }>(url, {
    timeoutMs,
    label,
    skipDedupe: label.includes("diagnostics"),
  });
  if (!result.ok) {
    return {
      data: null,
      error: result.timedOut
        ? `Timed out after ${Math.round(timeoutMs / 1000)}s`
        : result.error || `Failed to load ${url}`,
    };
  }
  if (result.data.ok === false) {
    return { data: null, error: result.data.error ?? `Failed to load ${url}` };
  }
  return { data: result.data as T, error: null };
}

function seedSummary(): SummaryPayload | null {
  if (typeof window === "undefined") return null;
  const cached = readCache();
  if (cached) return cached;
  const shared = peekSharedCanonicalStatus();
  if (!shared) return null;
  return {
    ok: true,
    mode: "summary",
    status: shared.state,
    snapshot: shared,
    checks: [],
    metrics: { memoryUsageMb: 0, uptimeSec: 0, queues: null },
    cron: { jobs: [], staleJobs: [] },
    sources: [],
    failedSources: [],
    totalMs: 0,
    checkedAt: shared.checkedAt,
    stale: shared.usedLastKnown || shared.freshness === "stale",
  };
}

export function HealthOperationsPanel() {
  const [summary, setSummary] = useState<SummaryPayload | null>(() => seedSummary());
  const [initialLoading, setInitialLoading] = useState(!summary);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  const loadSummary = useCallback(async (isInitial: boolean) => {
    if (!isInitial) setRefreshing(true);
    const result = await fetchJson<SummaryPayload>(
      "/api/admin/ops/health-summary",
      SUMMARY_TIMEOUT_MS,
      "health-page-summary"
    );
    if (result.data) {
      setSummary(result.data);
      writeCache(result.data);
      setError(null);
    } else if (!summary) {
      setError(result.error);
    } else {
      setError(result.error);
    }
    setInitialLoading(false);
    setRefreshing(false);
  }, [summary]);

  const loadDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    setDiagError(null);
    const result = await fetchJson<DiagnosticsPayload>(
      "/api/admin/ops/health",
      DIAG_TIMEOUT_MS,
      "health-page-diagnostics"
    );
    if (result.data) setDiagnostics(result.data);
    else setDiagError(result.error);
    setDiagLoading(false);
  }, []);

  useEffect(() => {
    void loadSummary(true);
    let timer: number | null = null;
    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!isDocumentHidden()) void loadSummary(false);
        schedule();
      }, statusIntervalForState(summary?.snapshot.state));
    };
    schedule();
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + poll only
  }, []);

  if (initialLoading && !summary) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={4} />
        <p className="av3-note">Loading health summary…</p>
      </Av3Stack>
    );
  }

  if (!summary) {
    return (
      <Av3Panel title="Platform health unavailable">
        <p className="av3-note">{error ?? "Unable to load health summary."}</p>
        <button type="button" className="av3-btn av3-btn--ghost" onClick={() => void loadSummary(true)}>
          Retry summary
        </button>
      </Av3Panel>
    );
  }

  const snapshot = summary.snapshot;
  const queues = summary.metrics.queues;
  const aiPending = queues?.aiPending ?? null;
  const imagePending = queues?.editorialImagesPending ?? null;

  return (
    <Av3Stack>
      <Av3Hero
        tone={snapshot.state}
        badge={<Av3StatusBadge tone={snapshot.state} label={snapshot.label} />}
        title={
          snapshot.score != null
            ? `Score ${snapshot.score}/100${snapshot.grade ? ` · Grade ${snapshot.grade}` : ""}`
            : "Platform health"
        }
        meta={
          <>
            Summary in {summary.totalMs}ms · Checked{" "}
            {new Date(summary.checkedAt).toLocaleString()}
            {refreshing ? " · Refreshing…" : null}
            {summary.stale ? " · Partial sources" : null}
          </>
        }
        action={
          <button
            type="button"
            className="av3-btn av3-btn--ghost"
            onClick={() => void loadSummary(false)}
          >
            Refresh
          </button>
        }
      />

      {error ? (
        <p className="av3-note av3-note--warn">
          Live refresh issue: {error}. Showing last-known summary.
        </p>
      ) : null}

      <Av3ReasonList reasons={snapshot.reasons} />

      {summary.failedSources.length > 0 ? (
        <Av3Panel title="Failed sources" subtitle="Retry only these panels">
          <ul className="av3-attention-list">
            {summary.failedSources.map((s) => (
              <li key={s.source} className="av3-attention-row av3-attention-row--warning">
                <span>
                  <em>{s.source}</em>
                  <strong>
                    {s.error ?? "unavailable"} · {s.ms}ms
                  </strong>
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="av3-btn av3-btn--ghost"
            onClick={() => void loadSummary(false)}
          >
            Retry failed sources
          </button>
        </Av3Panel>
      ) : null}

      <Av3MetricGrid>
        <Av3Metric
          label="Summary latency"
          value={`${summary.totalMs}ms`}
          hint="Fast path target &lt;1.5s"
        />
        <Av3Metric
          label="Memory"
          value={`${summary.metrics.memoryUsageMb} MB`}
          hint={`Uptime ${Math.round(summary.metrics.uptimeSec / 60)}m`}
        />
        <Av3Metric
          label="AI queue"
          value={aiPending ?? "—"}
          hint="Pending jobs"
        />
        <Av3Metric
          label="Image queue"
          value={imagePending ?? "—"}
          hint="Editorial images"
        />
      </Av3MetricGrid>

      <Av3Panel title="Service checks" subtitle="Fast summary probes">
        <ul className="av3-health-list">
          {summary.checks.map((check) => (
            <Av3HealthRow
              key={check.id}
              label={check.label}
              status={check.status}
              latencyMs={check.latencyMs}
              message={check.message ? truncateText(check.message, 120) : undefined}
            />
          ))}
        </ul>
      </Av3Panel>

      <Av3Panel title="Cron jobs" subtitle="Latest heartbeat">
        {summary.cron.staleJobs?.length ? (
          <div style={{ marginBottom: "0.65rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {summary.cron.staleJobs.map((job) => (
              <Av3StatusBadge key={job} tone="warning" label={`Stale: ${job}`} />
            ))}
          </div>
        ) : (
          <p className="av3-note">No stale cron jobs in summary.</p>
        )}
        {(summary.cron.jobs ?? []).slice(0, 6).map((job) => (
          <div key={`${job.job}-${job.startedAt}`} className="av3-cron-row">
            <span>{job.job}</span>
            <Av3StatusBadge tone={job.ok ? "healthy" : "critical"} label={job.ok ? "OK" : "Failed"} />
            <span className="av3-health-row__latency">
              {new Date(job.startedAt).toLocaleString()}
            </span>
          </div>
        ))}
      </Av3Panel>

      <Av3Panel title="Newsroom health" subtitle="Editorial layer signals">
        <NewsroomHealthPanel />
      </Av3Panel>

      <Av3Disclosure
        title="View diagnostics"
        onOpenChange={(open) => {
          if (open && !diagnostics && !diagLoading) void loadDiagnostics();
        }}
      >
        <Av3Stack>
          {diagLoading ? <Av3SkeletonGrid count={3} /> : null}
          {diagError ? (
            <p className="av3-note av3-note--warn">
              Diagnostics failed: {diagError}.{" "}
              <button type="button" className="av3-btn av3-btn--ghost" onClick={() => void loadDiagnostics()}>
                Retry diagnostics
              </button>
            </p>
          ) : null}
          {diagnostics ? (
            <>
              <Av3MetricGrid>
                <Av3Metric
                  label="Stability"
                  value={diagnostics.stability.score}
                  hint={`Grade ${diagnostics.stability.grade}`}
                />
                <Av3Metric
                  label="Errors (24h)"
                  value={diagnostics.errors.last24h}
                  hint={`Critical ${diagnostics.errors.bySeverity.critical ?? 0}`}
                />
                <Av3Metric
                  label="Redis"
                  value={diagnostics.caching.redis ? "Connected" : "Off"}
                  hint={`Sentry ${diagnostics.observability.sentry ? "on" : "off"}`}
                />
              </Av3MetricGrid>
              {diagnostics.queueAnalytics ? (
                <Av3Panel title="Queue analytics" compact>
                  <p className="av3-note">
                    AI pending {diagnostics.queueAnalytics.ai.pending} · Drain{" "}
                    {diagnostics.queueAnalytics.ai.drainPerHour}/hr · ETA{" "}
                    {diagnostics.queueAnalytics.ai.eta.etaLabel}
                  </p>
                </Av3Panel>
              ) : null}
              <Av3Panel title="Recent errors" compact>
                {diagnostics.recentErrors.length === 0 ? (
                  <p className="av3-note">No recent errors</p>
                ) : (
                  <ul className="anr-dense-list">
                    {diagnostics.recentErrors.slice(0, 8).map((e) => (
                      <li key={e.id}>
                        <span>
                          <Av3StatusBadge status={e.severity} label={e.severity} /> {e.source} —{" "}
                          {truncateText(e.message, 100)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Av3Panel>
            </>
          ) : null}
          <p className="av3-note">
            Heavy diagnostics load on demand only.{" "}
            <Link href="/admin/technical">Open Platform overview</Link>
          </p>
        </Av3Stack>
      </Av3Disclosure>
    </Av3Stack>
  );
}
