"use client";

import { History as HistoryIcon, MessageSquarePlus, X } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import type { AiHistorySession } from "../types";

export type HistoryProps = {
  id?: string;
  sessions: AiHistorySession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onClose?: () => void;
  /** Overlay drawer on mobile/tablet */
  variant?: "sidebar" | "drawer";
  className?: string;
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Conversation history sidebar or drawer.
 */
export function History({
  id,
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  onClose,
  variant = "sidebar",
  className,
}: HistoryProps) {
  return (
    <aside
      id={id}
      className={cn(
        "ai-v3-history",
        variant === "drawer" && "ai-v3-history--drawer",
        className
      )}
      aria-label="Conversation history"
    >
      <header className="ai-v3-history__header">
        <div className="ai-v3-history__title-row">
          <HistoryIcon size={16} aria-hidden />
          <h2 className="ai-v3-history__title">History</h2>
        </div>
        {onClose && (
          <button
            type="button"
            className="ai-v3-history__close jds-focus-ring"
            onClick={onClose}
            aria-label="Close history"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </header>

      <button
        type="button"
        className="ai-v3-history__new jds-focus-ring"
        onClick={onNewChat}
      >
        <MessageSquarePlus size={16} aria-hidden />
        New chat
      </button>

      {sessions.length === 0 ? (
        <p className="ai-v3-history__empty">No previous conversations yet.</p>
      ) : (
        <ul className="ai-v3-history__list" role="list">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <li key={session.id}>
                <button
                  type="button"
                  className={cn(
                    "ai-v3-history__item jds-focus-ring",
                    isActive && "ai-v3-history__item--active"
                  )}
                  onClick={() => onSelect(session.id)}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="ai-v3-history__item-title">{session.title}</span>
                  <span className="ai-v3-history__item-preview">{session.preview}</span>
                  <span className="ai-v3-history__item-meta">
                    {formatRelativeTime(session.updatedAt)} · {session.messageCount} messages
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
