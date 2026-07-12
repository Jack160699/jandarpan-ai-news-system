"use client";

import { AlertTriangle } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import type { NotificationItem } from "../types";
import { NotificationList } from "./NotificationList";

export type BreakingAlertsProps = {
  items: NotificationItem[];
  listId: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onToggleSaved?: (id: string) => void;
};

export function BreakingAlerts({
  items,
  listId,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onOpen,
  onToggleSaved,
}: BreakingAlertsProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="nc-section nc-section--breaking"
      aria-labelledby={`${listId}-breaking-heading`}
    >
      <div className="nc-section__header">
        <span className="nc-section__kicker">
          <AlertTriangle size={14} aria-hidden />
          Priority
        </span>
        <SectionHeader
          id={`${listId}-breaking-heading`}
          title="Breaking alerts"
        />
      </div>
      <NotificationList
        items={items}
        listId={`${listId}-breaking`}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onOpen={onOpen}
        onToggleSaved={onToggleSaved}
        label="Breaking alerts"
      />
    </section>
  );
}
