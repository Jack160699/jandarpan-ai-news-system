"use client";

import { useMemo, useState } from "react";
import { ConfidenceBadge } from "@/components/admin-newsroom/ConfidenceBadge";
import { StoryRowActions } from "@/components/admin-newsroom/StoryRowActions";
import { useStoriesDesk } from "@/hooks/useStoriesDesk";
import type { DashboardGeneratedArticle } from "@/lib/editorial-dashboard/types";

type StoriesTableProps = {
  articles?: DashboardGeneratedArticle[];
};

export function StoriesTable({ articles: articlesProp }: StoriesTableProps) {
  const { data, loading, error } = useStoriesDesk();
  const articles = articlesProp ?? data?.generatedArticles ?? [];

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confMin, setConfMin] = useState(0);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter !== "all" && a.editorial_status !== statusFilter) {
        return false;
      }
      if ((a.ai_confidence ?? 0) < confMin / 100) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !a.headline.toLowerCase().includes(q) &&
          !(a.summary ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [articles, statusFilter, confMin, query]);

  if (loading && !data) {
    return (
      <div className="anr-card">
        <div className="anr-empty">
          <div className="anr-skeleton" style={{ height: "12rem" }} />
        </div>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}

      <div className="anr-toolbar">
        <input
          className="anr-input"
          placeholder="Search headlines…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="anr-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="anr-select"
          value={String(confMin)}
          onChange={(e) => setConfMin(Number(e.target.value))}
        >
          <option value="0">Any confidence</option>
          <option value="50">≥ 50%</option>
          <option value="65">≥ 65%</option>
          <option value="75">≥ 75%</option>
        </select>
        <span className="anr-meta">{filtered.length} stories</span>
      </div>

      <div className="anr-card">
        <div className="anr-table-wrap">
          <table className="anr-table">
            <thead>
              <tr>
                <th>Headline</th>
                <th>Status</th>
                <th>Conf.</th>
                <th>Read</th>
                <th>SEO</th>
                <th>Sources</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.id}>
                  <td style={{ maxWidth: "18rem" }}>
                    <strong style={{ display: "block", lineHeight: 1.35 }}>
                      {article.headline}
                    </strong>
                    <span className="anr-meta">{article.slug}</span>
                    {article.is_breaking ? (
                      <span className="anr-badge anr-badge--breaking" style={{ marginLeft: "0.35rem" }}>
                        Breaking
                      </span>
                    ) : null}
                    {article.is_featured ? (
                      <span className="anr-badge" style={{ marginLeft: "0.35rem" }}>
                        Featured
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`anr-badge anr-badge--${article.editorial_status}`}>
                      {article.editorial_status}
                    </span>
                  </td>
                  <td>
                    <ConfidenceBadge score={article.ai_confidence} />
                  </td>
                  <td>
                    <ConfidenceBadge score={article.readability} />
                  </td>
                  <td>
                    <ConfidenceBadge score={article.seo_quality} />
                  </td>
                  <td>{article.source_count ?? "—"}</td>
                  <td>
                    <StoryRowActions article={article} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <p className="anr-empty">No stories match filters.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
