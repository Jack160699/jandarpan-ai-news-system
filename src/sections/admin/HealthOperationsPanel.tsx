"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";

type HealthPayload = {
  ok: boolean;
  status: string;
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
    api: Array<{ route: string; durationMs: number; status: number }>;
    workers: Array<{ worker: string; ok: boolean; durationMs: number }>;
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
};

const STATUS_CLASS: Record<string, string> = {
  healthy: "anr-pulse-item--stable",
  degraded: "anr-pulse-item--warning",
  unhealthy: "anr-pulse-item--breaking",
  unknown: "",
};

export function HealthOperationsPanel() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ops/health", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load health data");
        setData(json);
        return;
      }
      setData(json);
    } catch {
      setError("Network error loading health dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return <p className="anr-meta">Loading platform health…</p>;
  }

  if (error && !data) {
    return (
      <div>
        <p className="anr-meta anr-meta--warn">{error}</p>
        <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="anr-health-ops">
      <div className="anr-health-ops__toolbar">
        <p className="anr-meta">
          Status: <strong>{data.status}</strong> · Grade{" "}
          <strong>{data.stability.grade}</strong> ({data.stability.score}/100)
        </p>
        <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="anr-ingestion__grid">
        <AdminCard title="Stability score" description="Production readiness">
          <p className="anr-health-ops__score">{data.stability.score}</p>
          <p className="anr-meta">Grade {data.stability.grade}</p>
        </AdminCard>
        <AdminCard title="Errors (24h)" description="Tracked ops events">
          <p className="anr-health-ops__score">{data.errors.last24h}</p>
          <p className="anr-meta">Critical: {data.errors.bySeverity.critical ?? 0}</p>
        </AdminCard>
        <AdminCard title="Memory" description="Node heap">
          <p className="anr-health-ops__score">{data.metrics.memoryUsageMb} MB</p>
          <p className="anr-meta">Uptime {Math.round(data.metrics.uptimeSec / 60)}m</p>
        </AdminCard>
        <AdminCard title="Cache layer" description="Upstash Redis">
          <p className="anr-health-ops__score">{data.caching.redis ? "ON" : "OFF"}</p>
          <p className="anr-meta">Sentry {data.observability.sentry ? "ON" : "OFF"}</p>
        </AdminCard>
      </div>

      <AdminCard title="Health checks" description="Supabase, OpenAI, cron, vectors, queues, ingestion">
        <ul className="anr-health-ops__checks">
          {data.checks.map((check) => (
            <li
              key={check.id}
              className={`anr-pulse-item ${STATUS_CLASS[check.status] ?? ""}`}
            >
              <span>{check.label}</span>
              <span>
                {check.status} · {check.latencyMs}ms
                {check.message ? ` — ${check.message}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <div className="anr-ingestion__split">
        <AdminCard title="Cron jobs" description="Last orchestration runs">
          {data.cron.staleJobs.length > 0 ? (
            <p className="anr-meta anr-meta--warn">
              Stale: {data.cron.staleJobs.join(", ")}
            </p>
          ) : null}
          <ul>
            {data.cron.jobs.slice(0, 6).map((job) => (
              <li key={`${job.job}-${job.startedAt}`}>
                {job.job} · {job.ok ? "ok" : "failed"} ·{" "}
                {new Date(job.startedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Queue backlog" description="AI + editorial images">
          <p className="anr-meta">
            AI pending: {data.metrics.queues?.aiPending ?? "—"}
          </p>
          <p className="anr-meta">
            Images pending: {data.metrics.queues?.editorialImagesPending ?? "—"}
          </p>
        </AdminCard>
      </div>

      <AdminCard title="Recent errors" description="Admin error tracking">
        <ul className="anr-health-ops__errors">
          {data.recentErrors.length === 0 ? (
            <li className="anr-meta">No recent errors</li>
          ) : (
            data.recentErrors.map((e) => (
              <li key={e.id}>
                <span className={`anr-tag anr-tag--${e.severity}`}>{e.severity}</span>
                <strong>{e.source}</strong> — {e.message}
                <br />
                <span className="anr-meta">{new Date(e.ts).toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>
      </AdminCard>

      <AdminCard title="Stability factors" description="Weighted production score">
        <ul>
          {data.stability.factors.map((f) => (
            <li key={f.name}>
              {f.name}: {Math.round(f.score)} ({Math.round(f.weight * 100)}%)
              {f.note ? ` — ${f.note}` : ""}
            </li>
          ))}
        </ul>
      </AdminCard>

      <p className="anr-meta">
        Public probe: <code>/api/health</code> · Auto-refresh 60s
      </p>
    </div>
  );
}
