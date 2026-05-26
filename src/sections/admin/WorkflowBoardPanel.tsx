"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  GitBranch,
  Loader2,
  MessageSquare,
  User,
} from "lucide-react";
import { nextStatusesForRole } from "@/lib/editorial-workflow/engine";
import {
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
  type WorkflowArticleCard,
  type WorkflowBoardSnapshot,
  type WorkflowStatus,
} from "@/lib/editorial-workflow/types";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { AdminModal } from "@/components/admin-newsroom/ui/AdminModal";

export function WorkflowBoardPanel() {
  const { role } = useAdminNewsroom();
  const [board, setBoard] = useState<WorkflowBoardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkflowArticleCard | null>(null);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{
    events: WorkflowBoardSnapshot["events"];
    comments: { id: string; author_email: string; body: string; created_at: string }[];
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/editorial/workflow", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) {
        const { ok: _ok, ...snapshot } = json;
        setBoard(snapshot as WorkflowBoardSnapshot);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  const loadDetail = useCallback(async (articleId: string) => {
    const res = await fetch(
      `/api/editorial/workflow/comment?articleId=${articleId}`,
      { credentials: "include" }
    );
    const json = await res.json();
    if (json.ok) {
      setTimeline({ events: json.events, comments: json.comments });
    }
  }, []);

  useEffect(() => {
    if (selected) void loadDetail(selected.id);
  }, [selected, loadDetail]);

  useEffect(() => {
    if (!board || !selected) return;
    for (const col of WORKFLOW_STATUSES) {
      const found = board.columns[col]?.find((c) => c.id === selected.id);
      if (found) {
        setSelected(found);
        break;
      }
    }
  }, [board, selected?.id]);

  async function transition(
    articleId: string,
    toStatus: WorkflowStatus,
    rejectionReason?: string
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/editorial/workflow/transition", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          toStatus,
          rejectionReason,
          comment: comment || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setToast(json.error ?? "Transition blocked");
        return;
      }
      setToast(`Moved to ${WORKFLOW_LABELS[toStatus]}`);
      setComment("");
      setRejectReason("");
      setRejectOpen(false);
      await refresh();
      if (selected?.id === articleId) {
        const updated = board?.columns[toStatus]?.find((c) => c.id === articleId);
        if (updated) setSelected(updated);
      }
    } finally {
      setBusy(false);
    }
  }

  async function postComment() {
    if (!selected || !comment.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/editorial/workflow/comment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selected.id,
          body: comment,
          workflowStatus: selected.workflow_status,
        }),
      });
      setComment("");
      await loadDetail(selected.id);
      setToast("Comment added");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !board) {
    return <div className="wf-skeleton" />;
  }

  if (!board) {
    return <p className="anr-meta">Workflow board unavailable. Run migration 027.</p>;
  }

  const nextActions = selected
    ? nextStatusesForRole(role, selected.workflow_status)
    : [];

  return (
    <div className="wf-board">
      <header className="wf-board__hero">
        <div>
          <p className="wf-board__eyebrow">Editorial pipeline</p>
          <h2 className="wf-board__title">Workflow command center</h2>
        </div>
        <div className="wf-stats">
          <article>
            <span>Pending review</span>
            <strong>{board.analytics.pending_review}</strong>
          </article>
          <article className="wf-stats--warn">
            <span>SLA overdue</span>
            <strong>{board.analytics.overdue}</strong>
          </article>
          <article className="wf-stats--ok">
            <span>Published today</span>
            <strong>{board.analytics.published_today}</strong>
          </article>
          <article>
            <span>Active stories</span>
            <strong>{board.analytics.total}</strong>
          </article>
        </div>
      </header>

      <div className="wf-layout">
        <div className="wf-kanban">
          {WORKFLOW_STATUSES.filter((s) => s !== "archived").map((status) => (
            <section key={status} className="wf-column">
              <header className="wf-column__head">
                <h3>{WORKFLOW_LABELS[status]}</h3>
                <span>{board.columns[status]?.length ?? 0}</span>
              </header>
              <div className="wf-column__cards">
                {(board.columns[status] ?? []).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`wf-card ${selected?.id === card.id ? "is-selected" : ""} ${card.is_overdue ? "is-overdue" : ""}`}
                    onClick={() => setSelected(card)}
                  >
                    <p className="wf-card__title">{card.headline}</p>
                    {card.summary ? (
                      <p className="wf-card__dek">{card.summary}</p>
                    ) : null}
                    <div className="wf-card__meta">
                      {card.is_overdue ? (
                        <span className="wf-badge wf-badge--danger">
                          <AlertTriangle size={10} /> SLA
                        </span>
                      ) : card.workflow_deadline_at ? (
                        <span className="wf-badge">
                          <Clock size={10} />
                          {new Date(card.workflow_deadline_at).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : null}
                      {card.assignee_email ? (
                        <span className="wf-badge">
                          <User size={10} />
                          {card.assignee_email.split("@")[0]}
                        </span>
                      ) : null}
                    </div>
                    {card.workflow_rejection_reason ? (
                      <p className="wf-card__reject">{card.workflow_rejection_reason}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="wf-drawer">
          {selected ? (
            <>
              <h3>{selected.headline}</h3>
              <p className="anr-meta">
                {WORKFLOW_LABELS[selected.workflow_status]} · {selected.slug}
              </p>
              <Link
                href={`/admin/editor/${selected.id}`}
                className="anr-btn anr-btn--ghost wf-drawer__edit"
              >
                Open editor
              </Link>

              <div className="wf-drawer__actions">
                <p className="wf-drawer__label">Transitions</p>
                {nextActions.length === 0 ? (
                  <p className="anr-meta">No actions for your role</p>
                ) : (
                  nextActions.map((to) => (
                    <button
                      key={to}
                      type="button"
                      className="anr-btn anr-btn--primary"
                      disabled={busy}
                      onClick={() => {
                        if (to === "draft") {
                          setRejectOpen(true);
                          return;
                        }
                        void transition(selected.id, to);
                      }}
                    >
                      → {WORKFLOW_LABELS[to]}
                    </button>
                  ))
                )}
                {nextActions.includes("draft") ? null : (
                  <button
                    type="button"
                    className="anr-btn anr-btn--ghost"
                    disabled={busy}
                    onClick={() => setRejectOpen(true)}
                  >
                    Reject to draft
                  </button>
                )}
              </div>

              <label className="wf-field">
                <span>
                  <MessageSquare size={12} /> Editor comment
                </span>
                <textarea
                  className="anr-input"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Notes for the desk…"
                />
                <button
                  type="button"
                  className="anr-btn anr-btn--ghost"
                  disabled={busy || !comment.trim()}
                  onClick={() => void postComment()}
                >
                  Add comment
                </button>
              </label>

              <section className="wf-timeline">
                <h4>
                  <GitBranch size={14} /> Activity
                </h4>
                <ul>
                  {timeline?.events.map((e) => (
                    <li key={e.id}>
                      <strong>
                        {e.event_type === "transition"
                          ? `${e.from_status} → ${e.to_status}`
                          : e.event_type}
                      </strong>
                      <span>
                        {e.actor_email ?? "system"} ·{" "}
                        {new Date(e.created_at).toLocaleString("en-IN")}
                      </span>
                      {e.rejection_reason ? <em>{e.rejection_reason}</em> : null}
                      {e.comment ? <p>{e.comment}</p> : null}
                    </li>
                  ))}
                  {timeline?.comments.map((c) => (
                    <li key={c.id} className="wf-timeline__comment">
                      <strong>{c.author_email}</strong>
                      <span>{new Date(c.created_at).toLocaleString("en-IN")}</span>
                      <p>{c.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <div className="wf-drawer__empty">
              <GitBranch size={28} strokeWidth={1.2} />
              <p>Select a story to review, approve, or comment</p>
            </div>
          )}
        </aside>
      </div>

      <section className="wf-workload">
        <h3>Editor workload</h3>
        <ul>
          {board.analytics.workload.length === 0 ? (
            <li className="anr-meta">No assignments yet</li>
          ) : (
            board.analytics.workload.map((w) => (
              <li key={w.email}>
                <span>{w.email}</span>
                <strong>{w.count}</strong>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="wf-feed">
        <h3>Recent workflow events</h3>
        <ul>
          {board.events.slice(0, 12).map((e) => (
            <li key={e.id}>
              <span className="wf-feed__type">{e.event_type}</span>
              <span>
                {e.actor_email ?? "system"} —{" "}
                {e.to_status ? WORKFLOW_LABELS[e.to_status as WorkflowStatus] : ""}
              </span>
              <time>{new Date(e.created_at).toLocaleString("en-IN")}</time>
            </li>
          ))}
        </ul>
      </section>

      <AdminModal
        open={rejectOpen}
        title="Reject to draft"
        subtitle="Story returns to the journalist with your note"
        onClose={() => !busy && setRejectOpen(false)}
        footer={
          <div className="anr-modal__actions">
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => setRejectOpen(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="anr-btn anr-btn--danger"
              disabled={busy || !rejectReason.trim()}
              onClick={() => {
                if (!selected) return;
                void transition(selected.id, "draft", rejectReason);
              }}
            >
              {busy ? "Rejecting…" : "Reject"}
            </button>
          </div>
        }
      >
        <textarea
          className="anr-input"
          placeholder="Rejection reason (required)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
        />
      </AdminModal>

      {toast ? <div className="anr-toast anr-toast--success">{toast}</div> : null}
    </div>
  );
}
