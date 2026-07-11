"use client";

import {
  CheckCheck,
  Settings,
  SquareCheck,
  X,
} from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { useLanguage } from "@/providers/LanguageProvider";

export type NotificationHeaderProps = {
  unreadCount: number;
  statusId: string;
  selectionMode: boolean;
  onEnterSelection: () => void;
  onMarkAllRead: () => void;
  onOpenSettings: () => void;
  onExitSelection: () => void;
};

export function NotificationHeader({
  unreadCount,
  statusId,
  selectionMode,
  onEnterSelection,
  onMarkAllRead,
  onOpenSettings,
  onExitSelection,
}: NotificationHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="nc-header">
      <div className="nc-header__titles">
        <p className="nc-header__kicker">JDP-013</p>
        <h1 className="nc-header__title">{t.profile.notifications}</h1>
        <p id={statusId} className="nc-header__status" aria-live="polite">
          {unreadCount > 0
            ? `${unreadCount} unread`
            : t.profile.notificationsHint}
        </p>
      </div>

      <div className="nc-header__actions">
        {selectionMode ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitSelection}
            aria-label="Exit selection mode"
          >
            <X size={16} aria-hidden />
            <span className="nc-header__action-label">Cancel</span>
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEnterSelection}
              aria-label="Select notifications"
            >
              <SquareCheck size={16} aria-hidden />
              <span className="nc-header__action-label">Select</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              aria-label="Mark all as read"
            >
              <CheckCheck size={16} aria-hidden />
              <span className="nc-header__action-label">Mark all read</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              aria-label="Open notification settings"
              aria-haspopup="dialog"
            >
              <Settings size={16} aria-hidden />
              <span className="nc-header__action-label">Settings</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
