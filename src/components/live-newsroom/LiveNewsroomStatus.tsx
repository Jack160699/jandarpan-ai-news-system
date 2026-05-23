"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/i18n/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

/** Live pulse + “Updated X min ago” — calm newsroom status */
export function LiveNewsroomStatus() {
  const { lastSyncedAt } = useLiveNewsroom();
  const { t, language } = useLanguage();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const relative = formatRelativeTime(lastSyncedAt, language);

  return (
    <div
      className="live-newsroom-status newsroom-sticky newsroom-sticky--live"
      role="status"
      aria-live="polite"
    >
      <span className="live-newsroom-status__pulse" aria-hidden>
        <span className="live-newsroom-status__dot" />
      </span>
      <span className="live-newsroom-status__label">{t.home.liveNewsroom}</span>
      <span className="live-newsroom-status__sep" aria-hidden>
        ·
      </span>
      <span className="live-newsroom-status__time">
        {t.home.updatedPrefix} {relative}
      </span>
    </div>
  );
}
