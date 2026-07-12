"use client";

import { BellOff } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { EmptyState } from "@/design-system/components/EmptyState";
import type { NotificationFilter } from "../types";

const EMPTY_COPY: Record<
  NotificationFilter,
  { title: string; description: string }
> = {
  all: {
    title: "No notifications yet",
    description:
      "Breaking alerts, government updates, and live desk stories will appear here.",
  },
  breaking: {
    title: "No breaking alerts",
    description: "You're all caught up on urgent stories for now.",
  },
  government: {
    title: "No government alerts",
    description: "Official notices and circulars will show up in this tab.",
  },
  saved: {
    title: "No saved alerts",
    description: "Bookmark important alerts to find them quickly later.",
  },
  unread: {
    title: "All caught up",
    description: "You've read every notification in your inbox.",
  },
};

export type NotificationEmptyStateProps = {
  filter: NotificationFilter;
  onOpenSettings?: () => void;
};

export function NotificationEmptyState({
  filter,
  onOpenSettings,
}: NotificationEmptyStateProps) {
  const copy = EMPTY_COPY[filter];

  return (
    <EmptyState
      className="nc-empty"
      title={copy.title}
      description={copy.description}
      icon={<BellOff size={28} strokeWidth={1.5} aria-hidden />}
    >
      {onOpenSettings ? (
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          Notification settings
        </Button>
      ) : null}
    </EmptyState>
  );
}
