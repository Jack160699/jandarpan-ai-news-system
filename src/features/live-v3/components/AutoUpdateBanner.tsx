"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

/**
 * V3 auto-update banner — surfaces pending feed merges from LiveNewsroomProvider.
 * Uses existing /api/homepage/live polling; no new backend.
 */
export function AutoUpdateBanner() {
  const {
    hasPendingUpdates,
    pendingCount,
    applyPendingUpdates,
    dismissPendingUpdates,
  } = useLiveNewsroom();
  const { t } = useLanguage();

  if (!hasPendingUpdates) return null;

  const label =
    pendingCount > 0
      ? `${t.home.newUpdatesAvailable} (${pendingCount})`
      : t.home.newUpdatesAvailable;

  return (
    <div
      className="lv3-auto-banner"
      role="region"
      aria-label={label}
    >
      <button
        type="button"
        className="lv3-auto-banner__action tap-target"
        onClick={applyPendingUpdates}
      >
        <span className="lv3-auto-banner__dot" aria-hidden />
        <span className="lv3-auto-banner__text">{label}</span>
        <span className="lv3-auto-banner__cta">{t.home.refreshFeed}</span>
      </button>
      <button
        type="button"
        className="lv3-auto-banner__dismiss tap-target"
        onClick={dismissPendingUpdates}
        aria-label={t.home.dismissUpdates}
      >
        ×
      </button>
    </div>
  );
}
