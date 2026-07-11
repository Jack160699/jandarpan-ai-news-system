"use client";

import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { NOTIFICATION_FILTERS } from "../constants";
import type { NotificationFilter } from "../types";

export type NotificationFiltersProps = {
  active: NotificationFilter;
  unreadCount: number;
  onChange: (filter: NotificationFilter) => void;
};

export function NotificationFilters({
  active,
  unreadCount,
  onChange,
}: NotificationFiltersProps) {
  const { language } = useLanguage();

  return (
    <div
      className="nc-filters"
      role="tablist"
      aria-label="Notification filters"
    >
      {NOTIFICATION_FILTERS.map((filter) => {
        const label = pickBilingualLabel(language, filter.label, filter.labelHi);
        const selected = active === filter.id;
        const count =
          filter.id === "unread" && unreadCount > 0
            ? ` (${unreadCount})`
            : "";

        return (
          <Chip
            key={filter.id}
            selected={selected}
            role="tab"
            aria-selected={selected}
            aria-controls="nc-notification-panel"
            onClick={() => onChange(filter.id)}
          >
            {label}
            {count}
          </Chip>
        );
      })}
    </div>
  );
}
