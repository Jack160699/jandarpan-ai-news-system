"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import type { SystemDashboard, ValidationReport } from "@/lib/system-validation/types";

type SystemPayload = {
  ok: boolean;
  enabled: boolean;
  dashboard: SystemDashboard;
};

const GRADE_COLOR: Record<string, string> = {
  A: "var(--anr-success)",
  B: "var(--anr-success)",
  C: "var(--anr-warning)",
  D: "var(--anr-warning)",
  F: "var(--anr-danger)",
};

const STATUS_COLOR: Record<string, string> = {
  pass: "var(--anr-success)",
  warn: "var(--anr-warning)",
  fail: "var(--anr-danger)",
  skip: "var(--anr-muted)",
};

export function SystemValidationPanel() {
  const [dashboard, setDashboard] = useState<SystemDashboard | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [lastReport, setLastReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as SystemPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load system dashboard");
        return;
      }
      setDashboard(json.dashboard);
      setEnabled(json.enabled);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), 90_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refresh]);

  async function runValidation() {
    setValidating(true);
    try {
      const res = await fetch("/api/admin/system/validate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runType: "full", selfHeal: true }),
      });
      const json = (await res.json()) as { ok: boolean; report?: ValidationReport };
      if (json.report) setLastReport(json.report);
      await refresh();
    } finally {
      setValidating(false);
    }
  }

  if (loading) {
    return <EmptyState title="Loading system validation…" hint="Release manager" />;
  }

  if (error || !dashboard) {
    return <EmptyState title="System validation offline" hint={error ?? "Unknown error"} />;
  }

  const deployColor =
    dashboard.deploymentStatus === "ready"
      ? "var(--anr-success)"
      : dashboard.deploymentStatus === "degraded"
        ? "var(--anr-warning)"
        : "var(--anr-danger)";

  const categories = Object.entries(dashboard.health).filter(
    ([key]) => key !== "overall"
  ) as Array<[string, SystemDashboard["health"]["database"]]>;

  return (
    <div className="anr-icenter">
      <div className="anr-icenter__terminal-bar">
        <LiveIndicator
          label={enabled ? "Validation engine active" : "Engine disabled"}
        />
        <span style={{ color: deployColor }}>
          Deployment: {dashboard.deploymentStatus}
        </span>
        <ClientTime />
        <button
          type="button"
          className="anr-btn anr-btn--sm"
          disabled={validating || !enabled}
          onClick={() => void runValidation()}
        >
          {validating ? "Validating…" : "Run Full Validation"}
        </button>
      </div>

      {!enabled && (
        <AdminCard title="Setup" className="anr-icenter__card">
          <p>
            Set <code>SYSTEM_VALIDATION_ENGINE=true</code> to enable on-demand
            validation runs with self-healing. Dashboard probes always available.
          </p>
        </AdminCard>
      )}

      <div className="anr-kpis anr-icenter__kpis">
        <div className="anr-kpi">
          <span className="anr-kpi__label">Overall Score</span>
          <span
            className="anr-kpi__value"
            style={{ color: GRADE_COLOR[dashboard.health.overall.grade] }}
          >
            {dashboard.health.overall.score} ({dashboard.health.overall.grade})
          </span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Pass / Warn / Fail</span>
          <span className="anr-kpi__value">
            {dashboard.health.overall.pass}/{dashboard.health.overall.warn}/
            {dashboard.health.overall.fail}
          </span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Warnings</span>
          <span className="anr-kpi__value">{dashboard.warnings.length}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Errors</span>
          <span className="anr-kpi__value">{dashboard.errors.length}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Running Jobs</span>
          <span className="anr-kpi__value">{dashboard.runningJobs.length}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Failed Jobs</span>
          <span className="anr-kpi__value">{dashboard.failedJobs.length}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Stale Crons</span>
          <span className="anr-kpi__value">{dashboard.cron.staleJobs.length}</span>
        </div>
        <div className="anr-kpi">
          <span className="anr-kpi__label">Recovery Actions</span>
          <span className="anr-kpi__value">{dashboard.recoveryActions.length}</span>
        </div>
      </div>

      <AdminCard title="Health Scores by Category" className="anr-icenter__card">
        <div className="anr-icenter__list">
          {categories.map(([name, score]) => (
            <div key={name} className="anr-icenter__list-item">
              <span style={{ textTransform: "capitalize" }}>{name}</span>
              <span style={{ color: GRADE_COLOR[score.grade] }}>
                {score.score} ({score.grade})
              </span>
            </div>
          ))}
        </div>
      </AdminCard>

      {lastReport && (
        <AdminCard title="Latest Validation Report" className="anr-icenter__card">
          <p>
            Run <code>{lastReport.runId.slice(0, 8)}</code> —{" "}
            {lastReport.productionReadiness.ready ? "Production ready" : "Not ready"} —{" "}
            {lastReport.durationMs}ms
          </p>
          {lastReport.productionReadiness.blockers.length > 0 && (
            <ul>
              {lastReport.productionReadiness.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      <AdminCard title="Validation Modules" className="anr-icenter__card">
        <div className="anr-icenter__list">
          {dashboard.modules.map((m) => (
            <div key={m.moduleId} className="anr-icenter__list-item">
              <div>
                <strong>{m.label}</strong>
                <br />
                <small className="anr-muted">{m.message}</small>
              </div>
              <span style={{ color: STATUS_COLOR[m.status] }}>{m.status}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      {(dashboard.failedJobs.length > 0 || dashboard.recoveryActions.length > 0) && (
        <AdminCard title="Observability" className="anr-icenter__card">
          {dashboard.failedJobs.length > 0 && (
            <>
              <h4>Failed / Stale Jobs</h4>
              <div className="anr-icenter__list">
                {dashboard.failedJobs.map((j) => (
                  <div key={j.id} className="anr-icenter__list-item">
                    <span>{j.label}</span>
                    <span className="anr-muted">{j.detail}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {dashboard.recoveryActions.length > 0 && (
            <>
              <h4>Recovery Actions</h4>
              <div className="anr-icenter__list">
                {dashboard.recoveryActions.map((a) => (
                  <div key={a.id} className="anr-icenter__list-item">
                    <span>
                      {a.actionType}
                      {a.target ? ` → ${a.target}` : ""}
                    </span>
                    <span>{a.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </AdminCard>
      )}

      {dashboard.lastRun && (
        <AdminCard title="Last Saved Run" className="anr-icenter__card">
          <p>
            Grade {dashboard.lastRun.overallGrade} · Score{" "}
            {dashboard.lastRun.overallScore} ·{" "}
            {dashboard.lastRun.productionReady ? "Ready" : "Not ready"} ·{" "}
            {dashboard.lastRun.passCount} pass, {dashboard.lastRun.failCount} fail
          </p>
        </AdminCard>
      )}
    </div>
  );
}
