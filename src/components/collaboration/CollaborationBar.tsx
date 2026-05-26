"use client";

import { Loader2, Lock, MessageSquare, Send, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCollaborationRoom } from "@/hooks/useCollaborationRoom";
import type { EditorLock, InlineComment } from "@/lib/collaboration/types";

type CollaborationBarProps = {
  articleId: string;
  editorHtml: string;
  onRemoteHtml?: (html: string) => void;
  onLockChange?: (lock: EditorLock | null) => void;
};

export function CollaborationBar({
  articleId,
  editorHtml,
  onRemoteHtml,
  onLockChange,
}: CollaborationBarProps) {
  const [session, setSession] = useState<{
    userId: string;
    email: string;
    tenantId: string;
  } | null>(null);
  const [lock, setLock] = useState<EditorLock | null>(null);
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setSession({
            userId: json.user.id,
            email: json.user.email,
            tenantId: json.membership.tenantId,
          });
        }
      });
  }, []);

  const { members, connected, broadcastDoc, setTyping } = useCollaborationRoom({
    roomId: articleId,
    roomType: "article",
    userId: session?.userId ?? "",
    email: session?.email ?? "",
    enabled: Boolean(session),
    onRemoteDoc: onRemoteHtml,
  });

  const acquireLock = useCallback(async () => {
    const res = await fetch("/api/collaboration/lock", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, action: "acquire" }),
    });
    const json = await res.json();
    if (json.lock) {
      setLock(json.lock);
      onLockChange?.(json.lock);
    }
  }, [articleId, onLockChange]);

  useEffect(() => {
    if (!session) return;
    acquireLock();
    loadComments();

    lockTimer.current = setInterval(() => {
      fetch("/api/collaboration/lock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, action: "heartbeat" }),
      });
    }, 60_000);

    return () => {
      if (lockTimer.current) clearInterval(lockTimer.current);
      fetch("/api/collaboration/lock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, action: "release" }),
      });
    };
  }, [session, articleId, acquireLock]);

  useEffect(() => {
    if (!session || !lock?.isOwner) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      broadcastDoc(editorHtml, false);
      setTyping(false);
      const version = Date.now();
      fetch("/api/collaboration/doc", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, version, html: editorHtml }),
      });
    }, 800);
    setTyping(true);
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [editorHtml, session, lock, articleId, broadcastDoc, setTyping]);

  async function loadComments() {
    const res = await fetch(
      `/api/collaboration/comments?articleId=${articleId}`,
      { credentials: "include" }
    );
    const json = await res.json();
    if (json.ok) setComments(json.comments);
  }

  async function postComment() {
    if (!commentText.trim()) return;
    await fetch("/api/collaboration/comments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, body: commentText }),
    });
    setCommentText("");
    loadComments();
  }

  async function requestApproval() {
    await fetch("/api/collaboration/approvals", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        articleId,
        message: "Ready for publish approval",
      }),
    });
  }

  const others = members.filter((m) => m.userId !== session?.userId);
  const readOnly = lock && !lock.isOwner;

  return (
    <div className="collab-bar">
      <div className="collab-bar__left">
        <span className={`collab-bar__live ${connected ? "is-on" : ""}`}>
          {connected ? "Live" : "Connecting…"}
        </span>
        <div className="collab-bar__presence" title="Editors in room">
          <Users size={14} />
          {others.length === 0 ? (
            <span className="collab-bar__meta">Only you</span>
          ) : (
            others.map((m) => (
              <span
                key={m.userId}
                className="collab-bar__avatar"
                style={{ background: m.color }}
                title={`${m.email}${m.typing ? " · typing…" : ""}`}
              >
                {m.displayName.slice(0, 1).toUpperCase()}
                {m.typing ? <span className="collab-bar__typing" /> : null}
              </span>
            ))
          )}
        </div>
        {lock ? (
          <span className={`collab-bar__lock ${lock.isOwner ? "is-own" : "is-blocked"}`}>
            <Lock size={12} />
            {lock.isOwner ? "You hold the lock" : `Locked by ${lock.lockedByEmail}`}
          </span>
        ) : (
          <Loader2 size={14} className="collab-bar__spin" />
        )}
        {readOnly ? (
          <span className="collab-bar__readonly">Read-only — request lock from editor</span>
        ) : null}
      </div>
      <div className="collab-bar__actions">
        <button
          type="button"
          className="collab-bar__btn"
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageSquare size={14} /> Comments
        </button>
        <button type="button" className="collab-bar__btn collab-bar__btn--primary" onClick={requestApproval}>
          Request approval
        </button>
      </div>

      {showComments ? (
        <div className="collab-bar__comments">
          <ul>
            {comments.map((c) => (
              <li key={c.id}>
                <strong>{c.authorEmail.split("@")[0]}</strong>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
          <div className="collab-bar__comment-form">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Inline comment… use @mention in hub chat"
              onKeyDown={(e) => e.key === "Enter" && postComment()}
            />
            <button type="button" onClick={postComment} aria-label="Send comment">
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
