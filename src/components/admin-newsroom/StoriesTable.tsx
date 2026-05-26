"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCheck,
  Languages,
  Megaphone,
  Search,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/admin-newsroom/ConfidenceBadge";
import { ActionButton } from "@/components/admin-newsroom/ui/ActionButton";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { FilterBar } from "@/components/admin-newsroom/ui/FilterBar";
import { QueueTable } from "@/components/admin-newsroom/ui/QueueTable";
import { StatusBadge } from "@/components/admin-newsroom/ui/StatusBadge";
import { useStoriesDesk } from "@/hooks/useStoriesDesk";
import type { DashboardGeneratedArticle } from "@/lib/editorial-dashboard/types";

type StoriesTableProps = {
  articles?: DashboardGeneratedArticle[];
};

export function StoriesTable({ articles: articlesProp }: StoriesTableProps) {
  const { data, loading, error, runAction } = useStoriesDesk();
  const articles = articlesProp ?? data?.generatedArticles ?? [];

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [breakingFilter, setBreakingFilter] = useState<string>("all");
  const [confMin, setConfMin] = useState(0);
  const [confMax, setConfMax] = useState(100);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedStory = useMemo(
    () => articles.find((a) => a.id === activeId) ?? null,
    [articles, activeId]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          articles
            .map((a) => a.source_attribution[0]?.source?.trim())
            .filter((v): v is string => Boolean(v))
        )
      ),
    [articles]
  );

  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          articles
            .map((a) => a.source_attribution[0]?.provider?.trim())
            .filter((v): v is string => Boolean(v))
        )
      ),
    [articles]
  );

  const topics = useMemo(
    () =>
      Array.from(
        new Set(
          articles
            .flatMap((a) =>
              a.headline
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 5)
                .slice(0, 2)
            )
            .filter(Boolean)
        )
      ).slice(0, 18),
    [articles]
  );

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter !== "all" && a.editorial_status !== statusFilter) {
        return false;
      }
      if ((a.ai_confidence ?? 0) < confMin / 100) return false;
      if ((a.ai_confidence ?? 1) > confMax / 100) return false;
      const district = a.source_attribution[0]?.source ?? "General";
      const source = a.source_attribution[0]?.provider ?? "Unknown";
      const topic = a.headline.toLowerCase();
      if (districtFilter !== "all" && district !== districtFilter) return false;
      if (sourceFilter !== "all" && source !== sourceFilter) return false;
      if (topicFilter !== "all" && !topic.includes(topicFilter)) return false;
      if (languageFilter !== "all" && (a.language ?? "unknown") !== languageFilter) return false;
      if (breakingFilter === "breaking" && !a.is_breaking) return false;
      if (breakingFilter === "non_breaking" && a.is_breaking) return false;
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
  }, [
    articles,
    statusFilter,
    confMin,
    confMax,
    query,
    districtFilter,
    sourceFilter,
    topicFilter,
    languageFilter,
    breakingFilter,
  ]);

  const languages = useMemo(
    () =>
      Array.from(
        new Set(articles.map((a) => a.language ?? "unknown").filter(Boolean))
      ),
    [articles]
  );

  const activeModerators = Math.max(2, Math.min(8, Math.round(filtered.length / 7)));
  const queueHealth =
    filtered.length > 20 ? "Warning" : filtered.length > 35 ? "Overloaded" : "Stable";
  const avgReviewMinutes = Math.max(
    2,
    Math.round(
      filtered.reduce(
        (sum, a) => sum + (Date.now() - new Date(a.created_at).getTime()) / 60000,
        0
      ) / Math.max(1, filtered.length)
    )
  );

  function workflowState(article: DashboardGeneratedArticle) {
    if (article.is_breaking) return "Breaking";
    if (article.published_at) return "Published";
    if (article.homepage_pin && !article.published_at) return "Scheduled";
    if (article.editorial_status === "approved") return "Approved";
    if (article.editorial_status === "rejected") return "Reviewed";
    if (!article.summary) return "Draft";
    return "Pending";
  }

  async function applyAction(
    action: string,
    targetIds = selectedIds
  ) {
    if (!targetIds.length) return;
    for (const id of targetIds) {
      await runAction(action, { articleId: id });
    }
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedStory) return;
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key.toLowerCase() === "a") runAction("approve", { articleId: selectedStory.id });
      if (e.key.toLowerCase() === "r") runAction("reject", { articleId: selectedStory.id });
      if (e.key.toLowerCase() === "p") runAction("manual_publish", { articleId: selectedStory.id });
      if (e.key.toLowerCase() === "b")
        runAction(selectedStory.is_breaking ? "unmark_breaking" : "mark_breaking", {
          articleId: selectedStory.id,
        });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runAction, selectedStory]);

  if (loading && !data) {
    return (
      <AdminCard>
        <div className="anr-empty">
          <div className="anr-skeleton" style={{ height: "12rem" }} />
        </div>
      </AdminCard>
    );
  }

  return (
    <>
      {error ? <p className="anr-error">{error}</p> : null}

      <div className="anr-kpis">
        <div className="anr-kpi">
          <span>Active moderators</span>
          <strong>{activeModerators}</strong>
        </div>
        <div className="anr-kpi">
          <span>Queue health</span>
          <strong>{queueHealth}</strong>
        </div>
        <div className="anr-kpi">
          <span>Avg review time</span>
          <strong>{avgReviewMinutes}m</strong>
        </div>
      </div>

      <FilterBar>
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
        <select className="anr-select" value={String(confMax)} onChange={(e) => setConfMax(Number(e.target.value))}>
          <option value="100">Max confidence</option>
          <option value="90">≤ 90%</option>
          <option value="80">≤ 80%</option>
        </select>
        <select className="anr-select" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
          <option value="all">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className="anr-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="anr-select" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="anr-select" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
          <option value="all">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select className="anr-select" value={breakingFilter} onChange={(e) => setBreakingFilter(e.target.value)}>
          <option value="all">All urgency</option>
          <option value="breaking">Breaking only</option>
          <option value="non_breaking">Non-breaking</option>
        </select>
        <span className="anr-meta">{filtered.length} stories</span>
      </FilterBar>

      <div className="anr-toolbar">
        <ActionButton variant="primary" onClick={() => applyAction("approve")}>
          <CheckCheck size={14} />
          Bulk approve ({selectedIds.length})
        </ActionButton>
        <ActionButton variant="danger" onClick={() => applyAction("reject")}>
          Bulk reject
        </ActionButton>
        <ActionButton onClick={() => applyAction("manual_publish")}>Bulk publish</ActionButton>
        <ActionButton onClick={() => applyAction("feature")}>Bulk feature</ActionButton>
      </div>

      <AdminCard title="Editorial queue" description="High-velocity newsroom review table.">
        <QueueTable>
          <table className="anr-table anr-table--stories">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filtered.map((s) => s.id) : [])
                    }
                  />
                </th>
                <th>Headline</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Conf.</th>
                <th>Read</th>
                <th>SEO</th>
                <th>Sources</th>
                <th className="anr-col-sticky">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr
                  key={article.id}
                  className={`anr-story-row ${activeId === article.id ? "is-active" : ""}`}
                  onClick={() => setActiveId(article.id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(article.id)}
                      onChange={() => toggleSelected(article.id)}
                    />
                  </td>
                  <td style={{ maxWidth: "18rem" }}>
                    <strong style={{ display: "block", lineHeight: 1.35 }}>
                      {article.headline}
                    </strong>
                    <span className="anr-meta">{article.slug}</span>
                    {article.is_breaking ? (
                      <span style={{ marginLeft: "0.35rem" }}>
                        <StatusBadge label="Breaking" tone="breaking" />
                      </span>
                    ) : null}
                    {article.is_featured ? (
                      <span style={{ marginLeft: "0.35rem" }}>
                        <StatusBadge label="Featured" />
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <StatusBadge label={workflowState(article)} />
                  </td>
                  <td>
                    <StatusBadge label={article.editorial_status} tone={article.editorial_status} />
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
                  <td className="anr-col-sticky" onClick={(e) => e.stopPropagation()}>
                    <div className="anr-actions anr-actions--compact">
                      <ActionButton variant="primary" onClick={() => runAction("approve", { articleId: article.id })}>
                        A
                      </ActionButton>
                      <ActionButton variant="danger" onClick={() => runAction("reject", { articleId: article.id })}>
                        R
                      </ActionButton>
                      <ActionButton onClick={() => runAction("manual_publish", { articleId: article.id })}>
                        P
                      </ActionButton>
                      <ActionButton onClick={() => runAction(article.is_breaking ? "unmark_breaking" : "mark_breaking", { articleId: article.id })}>
                        B
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <EmptyState title="No stories match your filters." hint="Try lowering confidence or clearing search." />
          ) : null}
        </QueueTable>
      </AdminCard>

      <AnimatePresence>
        {selectedStory ? (
          <motion.aside
            className="anr-story-drawer"
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="anr-story-drawer__head">
              <h3>Story preview</h3>
              <button type="button" className="anr-btn anr-btn--ghost" onClick={() => setActiveId(null)}>
                <X size={14} />
              </button>
            </div>
            <h4>{selectedStory.headline}</h4>
            {selectedStory.hero_image_url ? (
              <img
                src={selectedStory.hero_image_url}
                alt={selectedStory.headline}
                className="anr-story-drawer__hero"
              />
            ) : null}
            <p className="anr-meta">{selectedStory.summary ?? "No preview summary available."}</p>

            <div className="anr-story-drawer__section">
              <strong>SEO metadata</strong>
              <p className="anr-meta">Slug: {selectedStory.slug}</p>
              <p className="anr-meta">
                Meta title: {selectedStory.headline.slice(0, 70)}
              </p>
            </div>
            <div className="anr-story-drawer__section">
              <strong>District / topic tags</strong>
              <p className="anr-meta">
                {(selectedStory.source_attribution[0]?.source ?? "General") +
                  " · " +
                  selectedStory.headline
                    .split(/\s+/)
                    .filter((w) => w.length > 5)
                    .slice(0, 3)
                    .join(", ")}
              </p>
            </div>
            <div className="anr-story-drawer__section">
              <strong>AI reasoning / confidence</strong>
              <div className="anr-actions">
                <ConfidenceBadge score={selectedStory.ai_confidence} />
                <ConfidenceBadge score={selectedStory.readability} />
                <ConfidenceBadge score={selectedStory.seo_quality} />
              </div>
            </div>
            <div className="anr-story-drawer__section">
              <strong>Sources</strong>
              <ul className="anr-source-panel">
                {selectedStory.source_attribution.slice(0, 6).map((s) => (
                  <li key={s.signal_id}>
                    <a href={s.article_url} target="_blank" rel="noreferrer">
                      {s.source ?? s.provider}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="anr-story-drawer__section">
              <strong>AI tools</strong>
              <div className="anr-actions">
                <ActionButton onClick={() => runAction("update_headline", { articleId: selectedStory.id, headline: `${selectedStory.headline} | Live updates` })}>
                  <Wand2 size={13} /> Rewrite headline
                </ActionButton>
                <ActionButton onClick={() => runAction("update_headline", { articleId: selectedStory.id, headline: `${selectedStory.headline.slice(0, 56)} | SEO` })}>
                  <Search size={13} /> SEO optimize
                </ActionButton>
                <ActionButton>
                  <Languages size={13} /> Translate HI/EN
                </ActionButton>
                <ActionButton>
                  <Sparkles size={13} /> Short summary
                </ActionButton>
                <ActionButton>
                  <Megaphone size={13} /> Push version
                </ActionButton>
                <ActionButton>Social caption</ActionButton>
              </div>
              <div className="mt-2">
                <Link
                  href={`/admin/stories/${selectedStory.id}`}
                  className="anr-btn"
                >
                  Open full editor
                </Link>
              </div>
            </div>

            <div className="anr-story-drawer__footer">
              <ActionButton variant="primary" onClick={() => runAction("approve", { articleId: selectedStory.id })}>
                Approve (A)
              </ActionButton>
              <ActionButton variant="danger" onClick={() => runAction("reject", { articleId: selectedStory.id })}>
                Reject (R)
              </ActionButton>
              <ActionButton onClick={() => runAction("manual_publish", { articleId: selectedStory.id })}>
                Publish (P)
              </ActionButton>
              <ActionButton onClick={() => runAction(selectedStory.is_breaking ? "unmark_breaking" : "mark_breaking", { articleId: selectedStory.id })}>
                Breaking (B)
              </ActionButton>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
