"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import type { ExecutionDashboard, ExecutionSuggestion } from "@/lib/seo-execution/types";

type ExecutionPayload = {
  ok: boolean;
  enabled: boolean;
  dashboard: ExecutionDashboard;
};

export function SeoExecutionPanel() {
  const [dashboard, setDashboard] = useState<ExecutionDashboard | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [auditingId, setAuditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo/execution", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as ExecutionPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load execution center");
        return;
      }
      setDashboard(json.dashboard);
      setEnabled(json.enabled);
      if (!selectedJobId && json.dashboard.jobs[0]) {
        setSelectedJobId(json.dashboard.jobs[0].id);
      }
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function runAudit(articleId: string) {
    setAuditingId(articleId);
    try {
      const res = await fetch(
        `/api/admin/seo/execution?auditArticleId=${encodeURIComponent(articleId)}`,
        { cache: "no-store", credentials: "include" }
      );
      const json = (await res.json()) as ExecutionPayload & {
        auditResult?: { ok: boolean; jobId?: string };
      };
      if (json.auditResult?.jobId) {
        setSelectedJobId(json.auditResult.jobId);
      }
      setDashboard(json.dashboard);
    } finally {
      setAuditingId(null);
    }
  }

  async function applySuggestions(ids: string[], approveAll = false, jobId?: string) {
    setActing(true);
    try {
      const res = await fetch("/api/admin/seo/execution/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionIds: ids, approveAll, jobId }),
      });
      if (res.ok) await refresh();
    } finally {
      setActing(false);
    }
  }

  async function rejectSuggestions(ids: string[]) {
    setActing(true);
    try {
      const res = await fetch("/api/admin/seo/execution/reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionIds: ids }),
      });
      if (res.ok) await refresh();
    } finally {
      setActing(false);
    }
  }

  if (loading && !dashboard) {
    return (
      <div className="anr-icenter">
        <div className="anr-skeleton" style={{ height: "14rem" }} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="SEO Execution offline" hint={error} />;
  }

  if (!dashboard) return null;

  const selectedJob = dashboard.jobs.find((j) => j.id === selectedJobId);
  const pendingSuggestions =
    selectedJob?.suggestions.filter((s) => s.status === "pending") ?? [];

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>SEO</strong>
          <em>EXECUTION</em>
        </div>
        <LiveIndicator label={enabled ? "Human-in-the-loop" : "Engine disabled"} />
      </header>

      {!enabled && (
        <AdminCard title="Feature flag" className="anr-icenter__card">
          <p className="anr-meta">
            Set <code>SEO_EXECUTION_ENGINE=true</code>. All changes require
            explicit editor approval — nothing is auto-published.
          </p>
        </AdminCard>
      )}

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>Pending</span>
          <strong className="anr-kpi--warn">{dashboard.pendingCount}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Applied</span>
          <strong>{dashboard.appliedCount}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Audit jobs</span>
          <strong>{dashboard.jobs.length}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Articles</span>
          <strong>{dashboard.recentArticles.length}</strong>
        </article>
      </div>

      <AdminCard title="Run SEO audit" className="anr-icenter__card">
        <ul className="anr-icenter__list">
          {dashboard.recentArticles.slice(0, 12).map((a) => (
            <li key={a.id}>
              <strong>{a.headline.slice(0, 70)}</strong>
              <span>
                {a.overallScore != null ? `Score ${a.overallScore}` : "Not audited"}
                {a.lastAuditAt ? (
                  <>
                    {" "}
                    · <ClientTime iso={a.lastAuditAt} preset="datetime" />
                  </>
                ) : null}
              </span>
              <button
                type="button"
                disabled={!enabled || auditingId === a.id}
                onClick={() => void runAudit(a.id)}
                style={{ marginLeft: "0.5rem" }}
              >
                {auditingId === a.id ? "Auditing…" : "Audit"}
              </button>
            </li>
          ))}
        </ul>
      </AdminCard>

      {selectedJob && (
        <>
          <AdminCard title={`Audit: ${selectedJob.article_slug}`} className="anr-icenter__card">
            <div className="anr-kpis" style={{ marginBottom: "1rem" }}>
              <article className="anr-kpi">
                <span>Overall</span>
                <strong>{selectedJob.audit_scores.overallScore}</strong>
              </article>
              <article className="anr-kpi">
                <span>SEO</span>
                <strong>{selectedJob.audit_scores.seoScore}</strong>
              </article>
              <article className="anr-kpi">
                <span>CTR</span>
                <strong>{selectedJob.audit_scores.ctrScore}</strong>
              </article>
              <article className="anr-kpi">
                <span>Google News</span>
                <strong>{selectedJob.audit_scores.googleNewsScore}</strong>
              </article>
            </div>
            <ul className="anr-icenter__list">
              {Object.entries(selectedJob.audit_scores.explanations).map(
                ([key, text]) => (
                  <li key={key}>
                    <strong>{key}</strong>
                    <span>{text}</span>
                  </li>
                )
              )}
            </ul>
          </AdminCard>

          <AdminCard title="Suggestions (review required)" className="anr-icenter__card">
            {pendingSuggestions.length === 0 ? (
              <EmptyState
                title="No pending suggestions"
                hint="All suggestions for this job have been reviewed."
              />
            ) : (
              <>
                <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() =>
                      void applySuggestions([], true, selectedJob.id)
                    }
                  >
                    Approve All & Apply
                  </button>
                </div>
                <SuggestionList
                  suggestions={pendingSuggestions}
                  acting={acting}
                  onApply={(id) => void applySuggestions([id])}
                  onReject={(id) => void rejectSuggestions([id])}
                />
              </>
            )}
          </AdminCard>
        </>
      )}

      <AdminCard title="Recent audit jobs" className="anr-icenter__card">
        <ul className="anr-icenter__list">
          {dashboard.jobs.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                style={{
                  fontWeight: selectedJobId === job.id ? "bold" : "normal",
                }}
              >
                {job.article_slug}
              </button>
              <span>
                Score {job.overall_score ?? "—"} · {job.suggestions.length}{" "}
                suggestions · {job.status}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}

function SuggestionList({
  suggestions,
  acting,
  onApply,
  onReject,
}: {
  suggestions: ExecutionSuggestion[];
  acting: boolean;
  onApply: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <ul className="anr-icenter__list">
      {suggestions.map((s) => (
        <li key={s.id} data-priority={s.priority}>
          <strong>
            [{s.priority}] {s.suggestion_type.replace(/_/g, " ")}
          </strong>
          <span>
            <em>Current:</em> {(s.current_value ?? "—").slice(0, 120)}
            <br />
            <em>Suggested:</em> {s.suggested_value.slice(0, 200)}
            <br />
            <em>Reason:</em> {s.reason}
            <br />
            <em>Impact:</em> {s.expected_impact} · Confidence{" "}
            {Math.round(s.confidence * 100)}%
          </span>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <button type="button" disabled={acting} onClick={() => onApply(s.id)}>
              Approve & Apply
            </button>
            <button type="button" disabled={acting} onClick={() => onReject(s.id)}>
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
