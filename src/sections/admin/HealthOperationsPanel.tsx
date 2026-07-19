"use client";

import { useCallback, useEffect, useState } from "react";
import { NewsroomHealthPanel } from "@/components/admin-newsroom/NewsroomHealthStrip";
import type { LaunchHealthWidget } from "@/lib/ops/launch-health";
import { deriveCanonicalHealth } from "@/lib/admin-v3/canonical-health";
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

type HealthPayload = {
  ok: boolean;
  status: string;
  timestamp?: string;
  stability: {
    score: number;
    grade: string;
    factors: Array<{ name: string; weight: number; score: number; note?: string }>;
  };
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
    queues: { aiPending: number; editorialImagesPending: number } | null;
  };
  cron: { jobs: Array<{ job: string; ok: boolean; startedAt: string }>; staleJobs: string[] };
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
    recentFailures: {
      ai: Array<{ articleId: string; error: string; retryCount: number; terminal: boolean; category: string }>;
      editorial: Array<{ articleId: string; error: string; retryCount: number; terminal: boolean; category: string }>;
    };
  };
  aiFinancial?: Record<string, unknown>;
  launchWidgets?: LaunchHealthWidget[];
};

const FETCH_TIMEOUT_MS = 8000;
const SLOW_SOURCE_MS = 3000;
const POLL_MS = 60_000;

function launchStatusLabel(status: string): string {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Warning";
  if (status === "unhealthy") return "Critical";
  return status;
}

async function fetchHealthPayload(): Promise<{ data: HealthPayload | null; error: string | null }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("/api/admin/ops/health", {
      credentials: "include",
      signal: controller.signal,
    });
    const json = (await res.json()) as HealthPayload & { error?: string };
    if (!res.ok || !json.ok) {
      return { data: json.ok === false ? json : null, error: json.error ?? "Failed to load health data" };
    }
    return { data: json, error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { data: null, error: "Health request timed out after 8s" };
    }
    return { data: null, error: "Network error loading health dashboard" };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function HealthOperationsPanel() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [slowSource, setSlowSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isInitial: boolean) => {
    if (isInitial) {
      setSlowSource(false);
      const slowTimer = window.setTimeout(() => setSlowSource(true), SLOW_SOURCE_MS);
      try {
        const result = await fetchHealthPayload();
        setData(result.data);
        setError(result.error);
      } finally {
        window.clearTimeout(slowTimer);
        setInitialLoading(false);
      }
      return;
    }

    setRefreshing(true);
    try {
      const result = await fetchHealthPayload();
      if (result.data) setData(result.data);
      setError(result.error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const id = window.setInterval(() => void load(false), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  if (initialLoading && !data) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={6} />
        {slowSource ? (
          <p className="av3-note av3-note--warn">Slow source: health API still responding.</p>
        ) : null}
      </Av3Stack>
    );
  }

  if (error && !data) {
    return (
      <Av3Panel title="Platform health unavailable">
        <p className="av3-note">{error}</p>
        <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load(true)}>
          Retry
        </button>
      </Av3Panel>
    );
  }

  if (!data) return null;

  const snapshot = deriveCanonicalHealth(data);
  const aiPending = data.metrics.queues?.aiPending ?? data.queueAnalytics?.ai.pending ?? null;
  const imagePending =
    data.metrics.queues?.editorialImagesPending ?? data.queueAnalytics?.editorial.pending ?? null;
  const queuePending =
    aiPending != null && imagePending != null ? aiPending + imagePending : aiPending ?? imagePending;

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
            Checked {new Date(snapshot.checkedAt).toLocaleString()}
            {refreshing ? " · Refreshing…" : null}
          </>
        }
        action={
          <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load(false)}>
            Refresh
          </button>
        }
      />

      <Av3ReasonList reasons={snapshot.reasons} />

      <Av3MetricGrid>
        <Av3Metric label="Stability score" value={data.stability.score} hint={`Grade ${data.stability.grade}`} />
        <Av3Metric label="Errors (24h)" value={data.errors.last24h} hint={`Critical ${data.errors.bySeverity.critical ?? 0}`} />
        <Av3Metric label="Memory" value={`${data.metrics.memoryUsageMb} MB`} hint={`Uptime ${Math.round(data.metrics.uptimeSec / 60)}m`} />
        <Av3Metric label="Redis cache" value={data.caching.redis ? "Connected" : "Off"} hint={`Sentry ${data.observability.sentry ? "on" : "off"}`} />
        <Av3Metric
          label="Queue pending"
          value={queuePending ?? "—"}
          hint={aiPending != null && imagePending != null ? `AI ${aiPending} · Images ${imagePending}` : "Backlog total"}
        />
      </Av3MetricGrid>

      <Av3Panel title="Service checks" subtitle="Supabase, OpenAI, cron, vectors, queues">
        <ul className="av3-health-list">
          {data.checks.map((check) => (
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

      <Av3Panel title="Cron jobs" subtitle="Last orchestration runs">
        {data.cron.staleJobs.length > 0 ? (
          <div style={{ marginBottom: "0.65rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {data.cron.staleJobs.map((job) => (
              <Av3StatusBadge key={job} tone="warning" label={`Stale: ${job}`} />
            ))}
          </div>
        ) : null}
        {data.cron.jobs.slice(0, 8).map((job) => (
          <div key={`${job.job}-${job.startedAt}`} className="av3-cron-row">
            <span>{job.job}</span>
            <Av3StatusBadge tone={job.ok ? "healthy" : "critical"} label={job.ok ? "OK" : "Failed"} />
            <span className="av3-health-row__latency">{new Date(job.startedAt).toLocaleString()}</span>
          </div>
        ))}
      </Av3Panel>

      {data.queueAnalytics ? (
        <div className="av3-metric-grid">
          <Av3Panel title="AI queue" subtitle="Drain and backlog" compact>
            <p className="av3-note">Pending: {data.queueAnalytics.ai.pending}</p>
            <p className="av3-note">Dead: {data.queueAnalytics.ai.dead}</p>
            <p className="av3-note">
              Drain {data.queueAnalytics.ai.drainPerHour}/hr · ETA {data.queueAnalytics.ai.eta.etaLabel}
            </p>
          </Av3Panel>
          <Av3Panel title="Editorial images" subtitle="Generation pipeline" compact>
            <p className="av3-note">Pending: {data.queueAnalytics.editorial.pending}</p>
            <p className="av3-note">Processing: {data.queueAnalytics.editorial.processing}</p>
            <p className="av3-note">
              OpenAI {data.queueAnalytics.editorial.openAiSuccessRate}% · Storage{" "}
              {data.queueAnalytics.editorial.storageSuccessRate}%
            </p>
          </Av3Panel>
          <Av3Panel title="Throughput" subtitle="Performance signals" compact>
            <p className="av3-note">
              AI {data.queueAnalytics.performance.aiRecordsPerSec} rec/s · Editorial{" "}
              {data.queueAnalytics.performance.editorialRecordsPerSec} rec/s
            </p>
            <p className="av3-note">Bottleneck: {data.queueAnalytics.performance.bottleneck}</p>
          </Av3Panel>
        </div>
      ) : null}

      {(data.launchWidgets?.length ?? 0) > 0 ? (
        <Av3Panel title="Launch readiness" subtitle="Pre-launch widget signals">
          <ul className="av3-health-list">
            {data.launchWidgets!.map((widget) => (
              <Av3HealthRow
                key={widget.id}
                label={widget.label}
                status={widget.status}
                statusLabel={launchStatusLabel(widget.status)}
                message={widget.detail}
              />
            ))}
          </ul>
        </Av3Panel>
      ) : null}

      <Av3Panel title="Newsroom health" subtitle="Editorial layer signals">
        <NewsroomHealthPanel />
      </Av3Panel>

      <Av3Disclosure title="View diagnostics">
        <Av3Stack>
          <Av3Panel title="Recent errors" subtitle="Admin error tracking" compact>
            {data.recentErrors.length === 0 ? (
              <p className="av3-note">No recent errors</p>
            ) : (
              <ul className="anr-dense-list">
                {data.recentErrors.map((e) => (
                  <li key={e.id}>
                    <span>
                      <Av3StatusBadge status={e.severity} label={e.severity} /> {e.source} —{" "}
                      {truncateText(e.message, 100)}
                    </span>
                    <em>{new Date(e.ts).toLocaleString()}</em>
                  </li>
                ))}
              </ul>
            )}
          </Av3Panel>

          <Av3Panel title="Stability factors" subtitle="Weighted production score" compact>
            <ul className="anr-dense-list">
              {data.stability.factors.map((f) => (
                <li key={f.name}>
                  <span>
                    {f.name}: {Math.round(f.score)} ({Math.round(f.weight * 100)}%)
                    {f.note ? ` — ${f.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Av3Panel>

          {data.aiFinancial ? (
            <Av3Panel title="AI financial snapshot" subtitle="Raw finance payload" compact>
              <p className="av3-note">
                Full AI financial data is in the executive cost dashboard. Public probe: /api/health
              </p>
              <pre className="av3-note" style={{ overflow: "auto", maxHeight: 240 }}>
                {JSON.stringify(data.aiFinancial, null, 2).slice(0, 4000)}
              </pre>
            </Av3Panel>
          ) : null}

          <p className="av3-note">Auto-refresh every 60s</p>
        </Av3Stack>
      </Av3Disclosure>
    </Av3Stack>
  );
}
