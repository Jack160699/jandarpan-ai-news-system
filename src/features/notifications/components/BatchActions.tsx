"use client";

import { Bookmark, Mail, MailOpen, Trash2 } from "lucide-react";
import { Button } from "@/design-system/components/Button";

export type BatchActionsProps = {
  selectedCount: number;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onRemove: () => void;
  onSelectAll: () => void;
  onClear: () => void;
};

export function BatchActions({
  selectedCount,
  onMarkRead,
  onMarkUnread,
  onRemove,
  onSelectAll,
  onClear,
}: BatchActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="nc-batch"
      role="toolbar"
      aria-label="Batch actions"
    >
      <p className="nc-batch__count" aria-live="polite">
        {selectedCount} selected
      </p>
      <div className="nc-batch__actions">
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          Select all
        </Button>
        <Button variant="ghost" size="sm" onClick={onMarkRead}>
          <MailOpen size={14} aria-hidden />
          Read
        </Button>
        <Button variant="ghost" size="sm" onClick={onMarkUnread}>
          <Mail size={14} aria-hidden />
          Unread
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 size={14} aria-hidden />
          Remove
        </Button>
        <Button variant="outline" size="sm" onClick={onClear}>
          <Bookmark size={14} aria-hidden />
          Done
        </Button>
      </div>
    </div>
  );
}
