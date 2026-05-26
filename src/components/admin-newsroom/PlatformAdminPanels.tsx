"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { StatusBadge } from "@/components/admin-newsroom/ui/StatusBadge";
import type {
  AdminArticleListItem,
  AdminDistrictRecord,
  AdminSourceRecord,
  AdminTopicRecord,
} from "@/lib/platform-admin/types";
import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load");
        return;
      }
      setData(json as T);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function PlatformArticlesPanel() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [items, setItems] = useState<AdminArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      source,
      workflowStatus,
      search,
    });
    try {
      const res = await fetch(`/api/admin/platform/articles?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to load articles");
        return;
      }
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [page, search, source, workflowStatus]);

  useEffect(() => {
    load();
  }, [load]);

  async function publishArticle(item: AdminArticleListItem) {
    await fetch(`/api/admin/platform/articles/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: item.source,
        workflowStatus: "published",
        publishedAt: new Date().toISOString(),
        editorialStatus: "approved",
      }),
    });
    load();
  }

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="anr-panel">
      <div className="anr-filter-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          className="anr-input"
          placeholder="Search headline, slug…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="anr-input"
          value={workflowStatus}
          onChange={(e) => setWorkflowStatus(e.target.value)}
        >
          <option value="all">All workflow</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        <select className="anr-input" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          <option value="generated">Generated (AI)</option>
          <option value="platform">Platform corpus</option>
        </select>
      </div>

      <p className="anr-meta">
        Supabase · {total} articles (generated_articles + platform_articles)
      </p>

      {loading ? <p className="anr-meta">Loading…</p> : null}
      {error ? <EmptyState title="Articles unavailable" description={error} /> : null}

      {!loading && !error ? (
        <>
          <div className="anr-table-wrap">
            <table className="anr-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Source</th>
                  <th>Workflow</th>
                  <th>District</th>
                  <th>Views 7d</th>
                  <th>SEO</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={`${a.source}-${a.id}`}>
                    <td>
                      <strong>{a.title}</strong>
                      <br />
                      <span className="anr-meta">{a.slug}</span>
                    </td>
                    <td>{a.source}</td>
                    <td>
                      <StatusBadge status={a.workflowStatus ?? "draft"} />
                    </td>
                    <td>{a.districtSlug ?? "—"}</td>
                    <td>{a.views}</td>
                    <td className="anr-meta">
                      {a.seoTitle ? "✓ title" : "—"} / {a.seoDescription ? "✓ desc" : "—"}
                    </td>
                    <td>
                      {a.source === "generated" ? (
                        <Link href={`/admin/editor/${a.id}`} className="anr-link">
                          Edit
                        </Link>
                      ) : null}
                      {a.workflowStatus !== "published" ? (
                        <button
                          type="button"
                          className="anr-btn anr-btn--sm"
                          onClick={() => publishArticle(a)}
                        >
                          Publish
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <button
              type="button"
              className="anr-btn anr-btn--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="anr-meta">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              className="anr-btn anr-btn--sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function PlatformDistrictsPanel() {
  const { data, loading, error, reload } = useFetch<{ districts: AdminDistrictRecord[] }>(
    "/api/admin/platform/districts"
  );
  const districts = data?.districts ?? [];

  async function toggleEnabled(slug: string, enabled: boolean) {
    await fetch(`/api/admin/platform/districts/${slug}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    reload();
  }

  if (loading) return <p className="anr-meta">Loading districts…</p>;
  if (error) return <EmptyState title="Districts unavailable" description={error} />;

  return (
    <div className="anr-panel">
      <p className="anr-meta">{districts.length} district hubs · live analytics from reader events</p>
      <div className="anr-table-wrap">
        <table className="anr-table">
          <thead>
            <tr>
              <th>District</th>
              <th>Articles</th>
              <th>Live</th>
              <th>Views 7d</th>
              <th>Sections</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.slug}>
                <td>
                  <strong>{d.nameEn}</strong> / {d.nameHi}
                  <br />
                  <span className="anr-meta">/districts/{d.slug}</span>
                </td>
                <td>{d.articleCount}</td>
                <td>{d.liveCount}</td>
                <td>{d.views7d}</td>
                <td className="anr-meta">{d.sections.join(", ")}</td>
                <td>
                  <button
                    type="button"
                    className="anr-btn anr-btn--sm"
                    onClick={() => toggleEnabled(d.slug, d.enabled)}
                  >
                    {d.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformTopicsPanel() {
  const { data, loading, error } = useFetch<{ topics: AdminTopicRecord[] }>(
    "/api/admin/platform/topics"
  );
  const topics = data?.topics ?? [];

  if (loading) return <p className="anr-meta">Loading topics…</p>;
  if (error) return <EmptyState title="Topics unavailable" description={error} />;

  return (
    <div className="anr-panel">
      <p className="anr-meta">SEO topic hubs · performance from article counts</p>
      <div className="anr-table-wrap">
        <table className="anr-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Articles</th>
              <th>Trend</th>
              <th>SEO</th>
              <th>AI keywords</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.slug}>
                <td>
                  <strong>{t.titleEn}</strong>
                  <br />
                  <Link href={`/topics/${t.slug}`} className="anr-link">
                    /topics/{t.slug}
                  </Link>
                </td>
                <td>{t.articleCount}</td>
                <td>{t.trendScore.toFixed(2)}</td>
                <td className="anr-meta">
                  {t.seoTitle ?? t.titleEn}
                </td>
                <td className="anr-meta">
                  {(t.aiKeywordSuggestions.length ? t.aiKeywordSuggestions : t.keywords)
                    .slice(0, 4)
                    .join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformSourcesPanel() {
  const { data, loading, error, reload } = useFetch<{
    sources: AdminSourceRecord[];
    summary: Record<string, number>;
  }>("/api/admin/platform/sources");
  const sources = data?.sources ?? [];
  const summary = data?.summary;

  async function toggleSource(id: string, enabled: boolean) {
    await fetch(`/api/admin/platform/sources/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    reload();
  }

  if (loading) return <p className="anr-meta">Loading RSS sources…</p>;
  if (error) return <EmptyState title="Sources unavailable" description={error} />;

  return (
    <div className="anr-panel">
      {summary ? (
        <p className="anr-meta">
          {summary.total} sources · {summary.enabled} enabled · {summary.healthy} healthy ·{" "}
          {summary.degraded} degraded · avg trust {(summary.avgTrust * 100).toFixed(0)}%
        </p>
      ) : null}
      <div className="anr-table-wrap">
        <table className="anr-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Trust</th>
              <th>Health</th>
              <th>Failures</th>
              <th>Enable</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  <br />
                  <span className="anr-meta">{s.sourceId ?? s.id}</span>
                </td>
                <td>{s.tier ?? "—"}</td>
                <td>{(s.trustScore * 100).toFixed(0)}%</td>
                <td>
                  <StatusBadge status={s.healthStatus} />
                </td>
                <td>{s.consecutiveFailures}</td>
                <td>
                  <button
                    type="button"
                    className="anr-btn anr-btn--sm"
                    onClick={() => toggleSource(s.id, s.enabled)}
                  >
                    {s.enabled ? "On" : "Off"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformSectionsPanel() {
  const { data, loading, error, reload } = useFetch<{
    config: { homepageSections: PlatformSectionConfig[] };
  }>("/api/admin/platform/config");
  const sections = data?.config?.homepageSections ?? [];

  async function toggleSection(key: string, enabled: boolean) {
    const next = sections.map((s) =>
      s.key === key ? { ...s, enabled: !enabled } : s
    );
    await fetch("/api/admin/platform/config", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "homepage_sections", value: next }),
    });
    reload();
  }

  if (loading) return <p className="anr-meta">Loading platform config…</p>;
  if (error) return <EmptyState title="Config unavailable" description={error} />;

  return (
    <ul className="anr-list">
      {sections.map((s) => (
        <li key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>
            {s.labelEn} — {s.enabled ? "enabled" : "disabled"}
          </span>
          <button
            type="button"
            className="anr-btn anr-btn--sm"
            onClick={() => toggleSection(s.key, s.enabled)}
          >
            Toggle
          </button>
        </li>
      ))}
    </ul>
  );
}
