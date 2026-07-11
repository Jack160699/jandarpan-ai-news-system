"use client";

import { PageContainer } from "@/layouts/PageContainer";
import { useIsDesktop } from "@/design-system/hooks";
import { useNotificationCenter } from "./hooks/useNotificationCenter";
import { NotificationHeader } from "./components/NotificationHeader";
import { NotificationFilters } from "./components/NotificationFilters";
import { BreakingAlerts } from "./components/BreakingAlerts";
import { GovernmentAlerts } from "./components/GovernmentAlerts";
import { SavedAlerts } from "./components/SavedAlerts";
import { NotificationList } from "./components/NotificationList";
import { NotificationEmptyState } from "./components/NotificationEmptyState";
import { NotificationLoadingState } from "./components/NotificationLoadingState";
import { BatchActions } from "./components/BatchActions";
import { SettingsPanel } from "./components/SettingsPanel";
import "./styles/notification-center.css";

export type NotificationCenterExperienceProps = {
  simulateLoadMs?: number;
};

/**
 * JDP-013 — Notification Center V3
 * UI-only inbox with filters, batch actions, and settings panel.
 */
export function NotificationCenterExperience({
  simulateLoadMs,
}: NotificationCenterExperienceProps) {
  const isDesktop = useIsDesktop();
  const nc = useNotificationCenter({ simulateLoadMs });

  const showBreakingSection =
    nc.filter === "all" && nc.breakingAlerts.length > 0;
  const showGovernmentSection =
    nc.filter === "all" && nc.governmentAlerts.length > 0;
  const showSavedSection = nc.filter === "saved";
  const showFlatList =
    nc.filter === "unread" ||
    nc.filter === "breaking" ||
    nc.filter === "government" ||
    (nc.filter === "all" && nc.filtered.length > 0);

  const listItems =
    nc.filter === "all"
      ? nc.filtered.filter(
          (item) =>
            item.category !== "breaking" && item.category !== "government"
        )
      : nc.filtered;

  return (
    <div className="nc-root jds-root" data-testid="notification-center-v3">
      <PageContainer width="default" className="nc-page">
        {nc.loading ? (
          <NotificationLoadingState />
        ) : (
          <>
            <NotificationHeader
              unreadCount={nc.unreadCount}
              statusId={nc.statusId}
              selectionMode={nc.selectionMode}
              onEnterSelection={nc.enterSelectionMode}
              onMarkAllRead={nc.markAllRead}
              onOpenSettings={() => nc.setSettingsOpen(true)}
              onExitSelection={nc.clearSelection}
            />

            <NotificationFilters
              active={nc.filter}
              unreadCount={nc.unreadCount}
              onChange={nc.setFilter}
            />

            <div
              id="nc-notification-panel"
              className={`nc-layout ${isDesktop ? "nc-layout--desktop" : ""}`}
              role="tabpanel"
              aria-labelledby="nc-notification-panel"
            >
              {nc.filtered.length === 0 ? (
                <NotificationEmptyState
                  filter={nc.filter}
                  onOpenSettings={() => nc.setSettingsOpen(true)}
                />
              ) : (
                <>
                  {showBreakingSection ? (
                    <BreakingAlerts
                      items={nc.breakingAlerts}
                      listId={nc.listId}
                      selectionMode={nc.selectionMode}
                      selectedIds={nc.selectedIds}
                      onToggleSelect={nc.toggleSelect}
                      onOpen={nc.openItem}
                      onToggleSaved={nc.toggleSaved}
                    />
                  ) : null}

                  {showGovernmentSection ? (
                    <GovernmentAlerts
                      items={nc.governmentAlerts}
                      listId={nc.listId}
                      selectionMode={nc.selectionMode}
                      selectedIds={nc.selectedIds}
                      onToggleSelect={nc.toggleSelect}
                      onOpen={nc.openItem}
                      onToggleSaved={nc.toggleSaved}
                    />
                  ) : null}

                  {showSavedSection ? (
                    <SavedAlerts
                      items={nc.savedAlerts}
                      listId={nc.listId}
                      selectionMode={nc.selectionMode}
                      selectedIds={nc.selectedIds}
                      onToggleSelect={nc.toggleSelect}
                      onOpen={nc.openItem}
                      onToggleSaved={nc.toggleSaved}
                    />
                  ) : null}

                  {showFlatList && listItems.length > 0 ? (
                    <section
                      className="nc-section"
                      aria-label={
                        nc.filter === "all" ? "More updates" : "Notifications"
                      }
                    >
                      {nc.filter === "all" ? (
                        <h2 className="nc-section__inline-title">More updates</h2>
                      ) : null}
                      <NotificationList
                        items={listItems}
                        listId={`${nc.listId}-main`}
                        selectionMode={nc.selectionMode}
                        selectedIds={nc.selectedIds}
                        onToggleSelect={nc.toggleSelect}
                        onOpen={nc.openItem}
                        onToggleSaved={nc.toggleSaved}
                      />
                    </section>
                  ) : null}
                </>
              )}
            </div>

            <BatchActions
              selectedCount={nc.selectedIds.size}
              onMarkRead={() => nc.markRead([...nc.selectedIds])}
              onMarkUnread={() => nc.markUnread([...nc.selectedIds])}
              onRemove={nc.removeSelected}
              onSelectAll={nc.selectAllVisible}
              onClear={nc.clearSelection}
            />
          </>
        )}
      </PageContainer>

      <SettingsPanel
        open={nc.settingsOpen}
        settings={nc.settings}
        onClose={() => nc.setSettingsOpen(false)}
        onChange={nc.updateSettings}
      />
    </div>
  );
}
