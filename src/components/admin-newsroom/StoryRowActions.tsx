"use client";

import { useState } from "react";
import { useStoriesDesk } from "@/hooks/useStoriesDesk";
import type { DashboardGeneratedArticle } from "@/lib/editorial-dashboard/types";

type StoryRowActionsProps = {
  article: DashboardGeneratedArticle;
};

export function StoryRowActions({ article }: StoryRowActionsProps) {
  const { runAction, busyId } = useStoriesDesk();
  const [showSources, setShowSources] = useState(false);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headline, setHeadline] = useState(article.headline);
  const busy = busyId?.includes(article.id) ?? false;

  async function act(action: string, extra?: Record<string, string | boolean>) {
    const optimisticMap: Record<
      string,
      (a: DashboardGeneratedArticle) => DashboardGeneratedArticle
    > = {
      approve: (a) => ({
        ...a,
        editorial_status: "approved",
        published_at: new Date().toISOString(),
      }),
      reject: (a) => ({
        ...a,
        editorial_status: "rejected",
        homepage_pin: false,
      }),
      mark_breaking: (a) => ({ ...a, is_breaking: true }),
      unmark_breaking: (a) => ({ ...a, is_breaking: false }),
      feature: (a) => ({ ...a, is_featured: true, homepage_pin: true }),
      unfeature: (a) => ({ ...a, is_featured: false, homepage_pin: false }),
    };

    await runAction(
      action,
      { articleId: article.id, ...extra },
      optimisticMap[action]
        ? {
            optimistic: (prev) => ({
              ...prev,
              generatedArticles: prev.generatedArticles.map((row) =>
                row.id === article.id ? optimisticMap[action](row) : row
              ),
            }),
          }
        : undefined
    );
  }

  return (
    <div>
      <div className={`anr-actions ${busy ? "anr-row--optimistic" : ""}`}>
        {article.editorial_status !== "approved" ? (
          <button
            type="button"
            className="anr-btn anr-btn--primary"
            disabled={busy}
            onClick={() => act("approve")}
          >
            Approve
          </button>
        ) : null}
        {article.editorial_status !== "rejected" ? (
          <button
            type="button"
            className="anr-btn anr-btn--danger"
            disabled={busy}
            onClick={() => act("reject")}
          >
            Reject
          </button>
        ) : null}
        <button
          type="button"
          className="anr-btn"
          disabled={busy}
          onClick={() => act("manual_publish")}
        >
          Publish
        </button>
        <button
          type="button"
          className="anr-btn"
          disabled={busy}
          onClick={() =>
            act(article.is_breaking ? "unmark_breaking" : "mark_breaking")
          }
        >
          {article.is_breaking ? "Unbreak" : "Breaking"}
        </button>
        <button
          type="button"
          className="anr-btn"
          disabled={busy}
          onClick={() => act(article.is_featured ? "unfeature" : "feature")}
        >
          {article.is_featured ? "Unfeature" : "Feature"}
        </button>
        <button
          type="button"
          className="anr-btn"
          disabled={busy}
          onClick={() => act("regenerate_article")}
        >
          Regen text
        </button>
        <button
          type="button"
          className="anr-btn"
          disabled={busy}
          onClick={() => act("regenerate_image")}
        >
          Regen image
        </button>
        <button
          type="button"
          className="anr-btn anr-btn--ghost"
          onClick={() => setEditingHeadline((v) => !v)}
        >
          Edit H
        </button>
        <button
          type="button"
          className="anr-btn anr-btn--ghost"
          onClick={() => setShowSources((v) => !v)}
        >
          Sources
        </button>
        <a
          href={`/story/${article.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="anr-btn anr-btn--ghost"
        >
          View
        </a>
      </div>

      {editingHeadline ? (
        <form
          className="anr-toolbar"
          style={{ marginTop: "0.5rem" }}
          onSubmit={async (e) => {
            e.preventDefault();
            await runAction("update_headline", {
              articleId: article.id,
              headline,
            });
            setEditingHeadline(false);
          }}
        >
          <input
            className="anr-input"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <button type="submit" className="anr-btn anr-btn--primary" disabled={busy}>
            Save
          </button>
        </form>
      ) : null}

      {showSources && article.source_attribution.length > 0 ? (
        <ul className="anr-source-panel">
          {article.source_attribution.map((s) => (
            <li key={s.signal_id}>
              <strong>{s.source ?? s.provider}</strong> ·{" "}
              {Math.round(s.confidence * 100)}% ·{" "}
              <a href={s.article_url} target="_blank" rel="noopener noreferrer">
                source ↗
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
