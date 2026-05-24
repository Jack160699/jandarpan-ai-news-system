"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/i18n/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";

/** Premium live newsroom status — pulse, waveform, AI verified */
export function LiveNewsroomStatus() {
  const { lastSyncedAt } = useLiveNewsroom();
  const { t, language } = useLanguage();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const relative = formatRelativeTime(lastSyncedAt, language);

  return (
    <div className="live-newsroom-status live-newsroom-status--premium" role="status" aria-live="polite">
      <span className="live-newsroom-status__live-dot" aria-hidden>
        <span className="live-newsroom-status__dot" />
      </span>
      <span className="live-newsroom-status__label">{t.home.liveNewsroom}</span>
      <span className="live-newsroom-status__wave" aria-hidden>
        <span /><span /><span /><span /><span />
      </span>
      <span className="live-newsroom-status__meta">
        <span className="live-newsroom-status__verified">AI verified</span>
        <span className="live-newsroom-status__sep" aria-hidden>
          •
        </span>
        <span className="live-newsroom-status__time">
          {t.home.updatedPrefix} {relative}
        </span>
      </span>
    </div>
  );
}
