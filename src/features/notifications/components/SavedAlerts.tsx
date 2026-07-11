"use client";

import { Bookmark } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import type { NotificationItem } from "../types";
import { NotificationList } from "./NotificationList";

export type SavedAlertsProps = {
  items: NotificationItem[];
  listId: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onToggleSaved?: (id: string) => void;
};

export function SavedAlerts({
  items,
  listId,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onOpen,
  onToggleSaved,
}: SavedAlertsProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="nc-section nc-section--saved"
      aria-labelledby={`${listId}-saved-heading`}
    >
      <div className="nc-section__header">
        <span className="nc-section__kicker">
          <Bookmark size={14} aria-hidden />
          Bookmarked
        </span>
        <SectionHeader
          id={`${listId}-saved-heading`}
          title="Saved alerts"
        />
      </div>
      <NotificationList
        items={items}
        listId={`${listId}-saved`}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onOpen={onOpen}
        onToggleSaved={onToggleSaved}
        label="Saved alerts"
      />
    </section>
  );
}
