"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  Building2,
  Check,
  Circle,
  Radio,
} from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { cn } from "@/design-system/utils/cn";
import type { NotificationItem } from "../types";

const CATEGORY_META = {
  breaking: {
    label: "Breaking",
    icon: AlertTriangle,
    tone: "breaking" as const,
  },
  government: {
    label: "Government",
    icon: Building2,
    tone: "government" as const,
  },
  live: {
    label: "Live",
    icon: Radio,
    tone: "live" as const,
  },
  general: {
    label: "Update",
    icon: Circle,
    tone: "default" as const,
  },
};

export type NotificationCardProps = {
  item: NotificationItem;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onToggleSaved?: (id: string) => void;
};

export function NotificationCard({
  item,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  onOpen,
  onToggleSaved,
}: NotificationCardProps) {
  const meta = CATEGORY_META[item.category];
  const Icon = meta.icon;

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect?.(item.id);
      return;
    }
    onOpen?.(item.id);
  };

  const mainContent = (
    <>
      {selectionMode ? (
        <span
          className={cn(
            "nc-card__checkbox",
            selected && "nc-card__checkbox--checked"
          )}
          aria-hidden
        >
          {selected ? <Check size={14} strokeWidth={3} /> : null}
        </span>
      ) : null}

      <div className="nc-card__main">
        <div className="nc-card__header">
          <span className={cn("nc-card__icon", `nc-card__icon--${meta.tone}`)}>
            <Icon size={14} aria-hidden />
          </span>
          <Badge
            variant={item.priority === "urgent" ? "breaking" : "default"}
            className="nc-card__badge"
          >
            {meta.label}
          </Badge>
          {!item.read ? (
            <span className="nc-card__unread" aria-label="Unread">
              <span className="sr-only">Unread</span>
            </span>
          ) : null}
          <time className="nc-card__time" dateTime={item.timestamp}>
            {item.timestamp}
          </time>
        </div>

        <h3 className="nc-card__title">{item.title}</h3>
        <p className="nc-card__body">{item.body}</p>

        <div className="nc-card__meta">
          {item.source ? <span>{item.source}</span> : null}
          {item.district ? (
            <>
              <span aria-hidden>·</span>
              <span>{item.district}</span>
            </>
          ) : null}
        </div>
      </div>
    </>
  );

  const className = cn(
    "nc-card",
    !item.read && "nc-card--unread",
    selected && "nc-card--selected",
    item.priority === "urgent" && "nc-card--urgent"
  );

  const saveButton =
    !selectionMode ? (
      <button
        type="button"
        className={cn(
          "nc-card__save jds-focus-ring",
          item.saved && "nc-card__save--active"
        )}
        aria-label={item.saved ? "Remove from saved" : "Save alert"}
        aria-pressed={item.saved}
        onClick={() => onToggleSaved?.(item.id)}
      >
        <Bookmark size={16} fill={item.saved ? "currentColor" : "none"} />
      </button>
    ) : null;

  if (selectionMode || !item.href) {
    return (
      <article className={className}>
        <div className="nc-card__surface">
          <button
            type="button"
            className="nc-card__button jds-focus-ring"
            onClick={handleCardClick}
            aria-pressed={selectionMode ? selected : undefined}
          >
            {mainContent}
          </button>
          {saveButton}
        </div>
      </article>
    );
  }

  return (
    <article className={className}>
      <div className="nc-card__surface">
        <Link
          href={item.href}
          className="nc-card__button jds-focus-ring"
          onClick={() => onOpen?.(item.id)}
        >
          {mainContent}
        </Link>
        {saveButton}
      </div>
    </article>
  );
}
