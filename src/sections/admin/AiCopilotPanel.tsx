"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import type {
  ArticleWorkspace,
  ChatResponse,
  CopilotDashboard,
} from "@/lib/ai-copilot/types";

type CopilotPayload = {
  ok: boolean;
  enabled: boolean;
  dashboard: CopilotDashboard;
  workspace: ArticleWorkspace | null;
};

export function AiCopilotPanel() {
  const [dashboard, setDashboard] = useState<CopilotDashboard | null>(null);
  const [workspace, setWorkspace] = useState<ArticleWorkspace | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "assistant"; text: string; response?: ChatResponse }>
  >([]);
  const [workspaceArticleId, setWorkspaceArticleId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const qs = workspaceArticleId
        ? `?articleId=${encodeURIComponent(workspaceArticleId)}`
        : "";
      const res = await fetch(`/api/admin/ai-copilot${qs}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as CopilotPayload & { error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load copilot");
        return;
      }
      setDashboard(json.dashboard);
      setWorkspace(json.workspace);
      setEnabled(json.enabled);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [workspaceArticleId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput("");
    setChatHistory((h) => [...h, { role: "user", text: message }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/ai-copilot/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = (await res.json()) as { ok: boolean; response?: ChatResponse };
      if (json.ok && json.response) {
        setChatHistory((h) => [
          ...h,
          { role: "assistant", text: json.response!.answer, response: json.response },
        ]);
      }
    } finally {
      setChatLoading(false);
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
    return <EmptyState title="AI Copilot offline" hint={error} />;
  }

  if (!dashboard) return null;

  const exec = dashboard.executive;

  return (
    <div className="anr-icenter">
      <header className="anr-icenter__terminal-bar">
        <div className="anr-icenter__brand">
          <span className="anr-icenter__dot" />
          <strong>AI</strong>
          <em>COPILOT</em>
        </div>
        <LiveIndicator label={enabled ? "Copilot active" : "Copilot disabled"} />
      </header>

      {!enabled && (
        <AdminCard title="Setup" className="anr-icenter__card">
          <p className="anr-meta">
            Set <code>AI_EDITORIAL_COPILOT=true</code>. Orchestrates existing
            intelligence modules — no duplicate engines, no auto-publishing.
          </p>
        </AdminCard>
      )}

      <div className="anr-kpis anr-icenter__kpis">
        <article className="anr-kpi anr-icenter__kpi">
          <span>SEO Health</span>
          <strong>{exec.overallSeoHealth}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Clicks (28d)</span>
          <strong>{exec.trafficTrend.clicks.toLocaleString()}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>SERP Visibility</span>
          <strong>{exec.serpVisibility}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Published today</span>
          <strong>{exec.publishingStatus.publishedToday}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Competitors today</span>
          <strong>{exec.competitorActivity.articlesLast24h}</strong>
        </article>
        <article className="anr-kpi anr-icenter__kpi">
          <span>Pending actions</span>
          <strong className="anr-kpi--warn">
            {dashboard.priorityQueue.length}
          </strong>
        </article>
      </div>

      <AdminCard title="AI Copilot Chat" className="anr-icenter__card">
        <div
          style={{
            maxHeight: 240,
            overflowY: "auto",
            marginBottom: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {chatHistory.length === 0 ? (
            <p className="anr-meta">
              Try: &quot;What should we publish today?&quot; · &quot;Which article
              should I improve first?&quot; · &quot;Show Korba opportunities&quot;
            </p>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} data-role={msg.role}>
                <strong>{msg.role === "user" ? "You" : "Copilot"}:</strong>{" "}
                {msg.text}
                {msg.response?.links?.length ? (
                  <div style={{ marginTop: "0.25rem" }}>
                    {msg.response.links.map((l) => (
                      <a key={l.href} href={l.href} style={{ marginRight: "0.75rem" }}>
                        {l.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendChat} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask the copilot…"
            style={{ flex: 1 }}
            disabled={!enabled || chatLoading}
          />
          <button type="submit" disabled={!enabled || chatLoading || !chatInput.trim()}>
            {chatLoading ? "…" : "Ask"}
          </button>
        </form>
      </AdminCard>

      <AdminCard title="Priority queue" className="anr-icenter__card">
        {dashboard.priorityQueue.length === 0 ? (
          <EmptyState
            title="Queue empty"
            hint="Enable intelligence crons and refresh recommendations."
          />
        ) : (
          <ul className="anr-icenter__list">
            {dashboard.priorityQueue.slice(0, 12).map((rec) => (
              <li key={rec.id} data-priority={rec.priority}>
                <strong>
                  [{rec.priority}] {rec.title}
                </strong>
                <span>
                  {rec.source} · score {rec.priority_score} · {rec.reason}
                </span>
                {rec.article_id ? (
                  <button
                    type="button"
                    style={{ marginLeft: "0.5rem" }}
                    onClick={() => {
                      setWorkspaceArticleId(rec.article_id);
                      void refresh();
                    }}
                  >
                    Open workspace
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {workspace && (
        <AdminCard title={`Workspace: ${workspace.article.headline}`} className="anr-icenter__card">
          <div className="anr-kpis" style={{ marginBottom: "1rem" }}>
            <article className="anr-kpi">
              <span>Overall SEO</span>
              <strong>
                {(workspace.seoAudit as { overallScore?: number })?.overallScore ?? "—"}
              </strong>
            </article>
            <article className="anr-kpi">
              <span>Pending suggestions</span>
              <strong>{workspace.pendingSuggestions}</strong>
            </article>
          </div>
          <p className="anr-meta">
            <a href={workspace.links.execution}>SEO Execution</a> ·{" "}
            <a href={workspace.links.editor}>Editor</a> ·{" "}
            <a href={workspace.links.story} target="_blank" rel="noreferrer">
              View story
            </a>
          </p>
          {workspace.keywordGaps.length > 0 && (
            <ul className="anr-icenter__list">
              {workspace.keywordGaps.map((g, i) => (
                <li key={i}>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      <div className="anr-icenter__layout">
        <AdminCard title="Breaking topics" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {exec.breakingTopics.map((t) => (
              <li key={t.topic}>
                <strong>{t.topic}</strong>
                <span>
                  {t.trend} · score {t.score}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="District coverage" className="anr-icenter__card">
          <ul className="anr-icenter__list">
            {exec.districtCoverage.map((d) => (
              <li key={d.district}>
                <strong>{d.district}</strong>
                <span>
                  {d.coveragePercent}% · {d.trend}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <AdminCard title="Executive reports" className="anr-icenter__card">
        <ul className="anr-icenter__list">
          {dashboard.recentReports.map((r) => (
            <li key={r.id}>
              <strong>{r.title}</strong>
              <span>{r.summary}</span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard title="Quick links" className="anr-icenter__card">
        <p className="anr-meta">
          <a href="/admin/seo/competitors">Competitors</a> ·{" "}
          <a href="/admin/seo/intelligence">SEO Intel</a> ·{" "}
          <a href="/admin/seo/rankings">SERP</a> ·{" "}
          <a href="/admin/seo/search-console">GSC</a> ·{" "}
          <a href="/admin/seo/execution">Execution</a>
        </p>
      </AdminCard>
    </div>
  );
}
