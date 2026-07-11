"use client";

import { Building2 } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import type { NotificationItem } from "../types";
import { NotificationList } from "./NotificationList";

export type GovernmentAlertsProps = {
  items: NotificationItem[];
  listId: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onToggleSaved?: (id: string) => void;
};

export function GovernmentAlerts({
  items,
  listId,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onOpen,
  onToggleSaved,
}: GovernmentAlertsProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="nc-section nc-section--government"
      aria-labelledby={`${listId}-gov-heading`}
    >
      <div className="nc-section__header">
        <span className="nc-section__kicker">
          <Building2 size={14} aria-hidden />
          Official
        </span>
        <SectionHeader
          id={`${listId}-gov-heading`}
          title="Government alerts"
        />
      </div>
      <NotificationList
        items={items}
        listId={`${listId}-government`}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onOpen={onOpen}
        onToggleSaved={onToggleSaved}
        label="Government alerts"
      />
    </section>
  );
}
