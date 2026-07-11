"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../constants";
import { NOTIFICATION_PLACEHOLDERS } from "../data/placeholders";
import type {
  NotificationFilter,
  NotificationItem,
  NotificationSettings,
} from "../types";

const LOAD_DELAY_MS = 480;

function matchesFilter(item: NotificationItem, filter: NotificationFilter): boolean {
  switch (filter) {
    case "breaking":
      return item.category === "breaking";
    case "government":
      return item.category === "government";
    case "saved":
      return item.saved;
    case "unread":
      return !item.read;
    default:
      return true;
  }
}

export type UseNotificationCenterOptions = {
  simulateLoadMs?: number;
};

export function useNotificationCenter(options: UseNotificationCenterOptions = {}) {
  const { simulateLoadMs = LOAD_DELAY_MS } = options;
  const listId = useId();
  const statusId = useId();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    ...DEFAULT_NOTIFICATION_SETTINGS,
  });
  const [loading, setLoading] = useState(simulateLoadMs > 0);

  useEffect(() => {
    if (simulateLoadMs <= 0) {
      setNotifications(NOTIFICATION_PLACEHOLDERS);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setNotifications(NOTIFICATION_PLACEHOLDERS);
      setLoading(false);
    }, simulateLoadMs);
    return () => window.clearTimeout(timer);
  }, [simulateLoadMs]);

  const filtered = useMemo(
    () => notifications.filter((item) => matchesFilter(item, filter)),
    [notifications, filter]
  );

  const breakingAlerts = useMemo(
    () => notifications.filter((item) => item.category === "breaking"),
    [notifications]
  );

  const governmentAlerts = useMemo(
    () => notifications.filter((item) => item.category === "government"),
    [notifications]
  );

  const savedAlerts = useMemo(
    () => notifications.filter((item) => item.saved),
    [notifications]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(filtered.map((item) => item.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const markRead = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setNotifications((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, read: true } : item))
    );
  }, []);

  const markUnread = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setNotifications((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, read: false } : item))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, saved: !item.saved } : item
      )
    );
  }, []);

  const removeSelected = useCallback(() => {
    setNotifications((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const openItem = useCallback(
    (id: string) => {
      markRead([id]);
    },
    [markRead]
  );

  const updateSettings = useCallback(
    (patch: Partial<NotificationSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  return {
    listId,
    statusId,
    notifications,
    filtered,
    breakingAlerts,
    governmentAlerts,
    savedAlerts,
    unreadCount,
    filter,
    setFilter,
    selectedIds,
    selectionMode,
    setSelectionMode,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    enterSelectionMode,
    markRead,
    markUnread,
    markAllRead,
    toggleSaved,
    removeSelected,
    openItem,
    settings,
    updateSettings,
    settingsOpen,
    setSettingsOpen,
    loading,
  };
}

export type NotificationCenterState = ReturnType<typeof useNotificationCenter>;
