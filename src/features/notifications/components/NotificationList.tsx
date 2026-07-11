"use client";

import type { NotificationItem } from "../types";
import { NotificationCard } from "./NotificationCard";

export type NotificationListProps = {
  items: NotificationItem[];
  listId: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onToggleSaved?: (id: string) => void;
  label?: string;
};

export function NotificationList({
  items,
  listId,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onOpen,
  onToggleSaved,
  label = "Notifications",
}: NotificationListProps) {
  return (
    <ul
      id={listId}
      className="nc-list"
      role="list"
      aria-label={label}
    >
      {items.map((item) => (
        <li key={item.id} className="nc-list__item" role="listitem">
          <NotificationCard
            item={item}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onToggleSaved={onToggleSaved}
          />
        </li>
      ))}
    </ul>
  );
}
