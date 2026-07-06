"use client";

import { useState } from "react";
import { useStoriesDesk } from "@/hooks/useStoriesDesk";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { hasPermission } from "@/lib/auth/admin-permissions";
import { ActionButton } from "@/components/admin-newsroom/ui/ActionButton";
import type { DashboardGeneratedArticle } from "@/lib/editorial-dashboard/types";

type StoryRowActionsProps = {
  article: DashboardGeneratedArticle;
};

export function StoryRowActions({ article }: StoryRowActionsProps) {
  const { runAction, busyId } = useStoriesDesk();
  const { role, roleResolved, permissions } = useAdminNewsroom();
  const [showSources, setShowSources] = useState(false);
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headline, setHeadline] = useState(article.headline);
  const busy = busyId?.includes(article.id) ?? false;

  const permCtx = { role, authReady: roleResolved, permissions };
  const canPublish = hasPermission(permCtx, "publish:write");
  const canEdit = hasPermission(permCtx, "editorial:write");

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

  if (!canEdit) {
    return (
      <a
        href={`/story/${article.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="anr-btn anr-btn--ghost"
      >
        View
      </a>
    );
  }

  return (
    <div>
      <div className={`anr-actions ${busy ? "anr-row--optimistic" : ""}`}>
        {canPublish && article.editorial_status !== "approved" ? (
          <ActionButton variant="primary" disabled={busy} onClick={() => act("approve")}>
            Approve
          </ActionButton>
        ) : null}
        {article.editorial_status !== "rejected" ? (
          <ActionButton variant="danger" disabled={busy} onClick={() => act("reject")}>
            Reject
          </ActionButton>
        ) : null}
        {canPublish ? (
          <ActionButton disabled={busy} onClick={() => act("manual_publish")}>
            Publish
          </ActionButton>
        ) : null}
        {canPublish ? (
          <>
            <ActionButton
              disabled={busy}
              onClick={() => act(article.is_breaking ? "unmark_breaking" : "mark_breaking")}
            >
              {article.is_breaking ? "Unbreak" : "Breaking"}
            </ActionButton>
            <ActionButton
              disabled={busy}
              onClick={() => act(article.is_featured ? "unfeature" : "feature")}
            >
              {article.is_featured ? "Unfeature" : "Feature"}
            </ActionButton>
          </>
        ) : null}
        <ActionButton disabled={busy} onClick={() => act("regenerate_article")}>
          Regen text
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => act("regenerate_image")}>
          Regen image
        </ActionButton>
        <ActionButton variant="ghost" onClick={() => setEditingHeadline((v) => !v)}>
          Edit H
        </ActionButton>
        <ActionButton variant="ghost" onClick={() => setShowSources((v) => !v)}>
          Sources
        </ActionButton>
        <a
          href={`/admin/editor/${article.id}`}
          className="anr-btn anr-btn--ghost"
        >
          Edit
        </a>
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
          <ActionButton type="submit" variant="primary" disabled={busy}>
            Save
          </ActionButton>
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
