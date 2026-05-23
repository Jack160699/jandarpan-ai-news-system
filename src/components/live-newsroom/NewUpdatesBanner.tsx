"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

/** Subtle “new updates” chip — tap to merge feed without full reload */
export function NewUpdatesBanner() {
  const { hasPendingUpdates, pendingCount, applyPendingUpdates, dismissPendingUpdates } =
    useLiveNewsroom();
  const { t } = useLanguage();

  if (!hasPendingUpdates) return null;

  const label =
    pendingCount > 0
      ? `${t.home.newUpdatesAvailable} (${pendingCount})`
      : t.home.newUpdatesAvailable;

  return (
    <div className="live-updates-banner" role="region" aria-label={label}>
      <button
        type="button"
        className="live-updates-banner__action tap-target"
        onClick={applyPendingUpdates}
      >
        <span className="live-updates-banner__dot" aria-hidden />
        <span className="live-updates-banner__text">{label}</span>
        <span className="live-updates-banner__cta">{t.home.refreshFeed}</span>
      </button>
      <button
        type="button"
        className="live-updates-banner__dismiss tap-target"
        onClick={dismissPendingUpdates}
        aria-label={t.home.dismissUpdates}
      >
        ×
      </button>
    </div>
  );
}
