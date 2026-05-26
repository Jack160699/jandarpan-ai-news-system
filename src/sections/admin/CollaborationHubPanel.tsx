"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  CheckCircle2,
  MessageCircle,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useCollaborationRoom } from "@/hooks/useCollaborationRoom";
import type { CollaborationSnapshot } from "@/lib/collaboration/types";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";

export function CollaborationHubPanel() {
  const [hub, setHub] = useState<CollaborationSnapshot | null>(null);
  const [session, setSession] = useState<{
    userId: string;
    email: string;
    tenantId: string;
  } | null>(null);
  const [chatText, setChatText] = useState("");
  const [loading, setLoading] = useState(true);

  const { members, connected } = useCollaborationRoom({
    tenantId: session?.tenantId ?? "",
    roomId: session?.tenantId ?? "",
    roomType: "tenant",
    userId: session?.userId ?? "",
    email: session?.email ?? "",
    enabled: Boolean(session?.tenantId),
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/collaboration/hub", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) setHub(json.hub);
    } finally {
      setLoading(false);
    }
  }, []);

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
    load();
    const id = setInterval(load, 12_000);
    return () => clearInterval(id);
  }, [load]);

  async function sendChat() {
    if (!chatText.trim()) return;
    await fetch("/api/collaboration/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: chatText, channel: "general" }),
    });
    setChatText("");
    load();
  }

  async function resolveApproval(
    requestId: string,
    status: "approved" | "rejected"
  ) {
    await fetch("/api/collaboration/approvals", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", requestId, status }),
    });
    load();
  }

  async function markRead(id: string) {
    await fetch("/api/collaboration/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    load();
  }

  if (loading && !hub) {
    return <div className="anr-skeleton" style={{ height: "16rem" }} />;
  }

  if (!hub) return <EmptyState title="Collaboration offline" hint="Check database migration 031." />;

  return (
    <div className="collab-hub">
      <header className="collab-hub__header">
        <div>
          <p className="collab-hub__kicker">Realtime desk</p>
          <h2>Collaboration</h2>
        </div>
        <span className={`collab-hub__live ${connected ? "is-on" : ""}`}>
          {connected ? "WebSocket live" : "Connecting…"} · {members.length} online
        </span>
      </header>

      <div className="collab-hub__presence">
        {members.map((m) => (
          <span
            key={m.userId}
            className="collab-hub__pill"
            style={{ borderColor: m.color }}
          >
            {m.displayName}
            {m.typing ? " …" : ""}
          </span>
        ))}
      </div>

      <div className="collab-hub__grid">
        <motion.section
          className="collab-hub__panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>
            <Activity size={14} /> Activity feed
          </h3>
          <ul className="collab-hub__feed">
            {hub.activity.map((e) => (
              <li key={e.id}>
                <time>
                  <ClientTime iso={e.createdAt} preset="time" />
                </time>
                <strong>{e.actorEmail.split("@")[0]}</strong>
                <span>{e.summary}</span>
              </li>
            ))}
            {!hub.activity.length ? (
              <li className="collab-hub__empty">No activity yet</li>
            ) : null}
          </ul>
        </motion.section>

        <motion.section
          className="collab-hub__panel collab-hub__panel--chat"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3>
            <MessageCircle size={14} /> Newsroom chat
          </h3>
          <div className="collab-hub__chat">
            {hub.chat.map((m) => (
              <div key={m.id} className="collab-hub__chat-msg">
                <strong>{m.authorEmail.split("@")[0]}</strong>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
          <div className="collab-hub__chat-input">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Message #general — @mentions via team UUID in API"
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
            />
            <button type="button" onClick={sendChat} aria-label="Send">
              <Send size={14} />
            </button>
          </div>
        </motion.section>

        <motion.section
          className="collab-hub__panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>
            <Bell size={14} /> Notifications
            {hub.unreadNotifications > 0 ? (
              <em className="collab-hub__badge">{hub.unreadNotifications}</em>
            ) : null}
          </h3>
          <ul className="collab-hub__notifs">
            {hub.notifications.map((n) => (
              <li key={n.id} data-read={Boolean(n.readAt)}>
                <button type="button" onClick={() => markRead(n.id)}>
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                </button>
              </li>
            ))}
          </ul>

          <h3 className="collab-hub__subhead">Approval requests</h3>
          <ul className="collab-hub__approvals">
            {hub.approvals.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.requestedByEmail}</strong>
                  <p>{a.message ?? "Approval needed"}</p>
                  {a.articleId ? (
                    <Link href={`/admin/editor/${a.articleId}`}>Open editor</Link>
                  ) : null}
                </div>
                <div className="collab-hub__approval-actions">
                  <button
                    type="button"
                    onClick={() => resolveApproval(a.id, "approved")}
                    aria-label="Approve"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveApproval(a.id, "rejected")}
                    aria-label="Reject"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </li>
            ))}
            {!hub.approvals.length ? (
              <li className="collab-hub__empty">No pending approvals</li>
            ) : null}
          </ul>
        </motion.section>
      </div>
    </div>
  );
}
