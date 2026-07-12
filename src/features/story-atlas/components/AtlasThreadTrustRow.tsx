"use client";

import { memo } from "react";
import { LiveBadge } from "@/components/homepage/LiveBadge";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { ThreadEntryTrust } from "../lib/derive-thread-entry-trust";

type AtlasThreadTrustRowProps = {
  trust: ThreadEntryTrust;
  language: NewsroomLanguage;
  showTime?: boolean;
};

export const AtlasThreadTrustRow = memo(function AtlasThreadTrustRow({
  trust,
  language,
  showTime = true,
}: AtlasThreadTrustRowProps) {
  const labels = {
    verified: pickBilingualLabel(language, "Verified", "सत्यापित"),
    breaking: pickBilingualLabel(language, "Breaking", "ब्रेकिंग"),
    live: pickBilingualLabel(language, "Live", "लाइव"),
    trustSummary: pickBilingualLabel(
      language,
      "Update trust information",
      "अपडेट विश्वसनीयता"
    ),
  };

  const hasContent =
    trust.showLive ||
    trust.showBreaking ||
    trust.verified ||
    trust.sourceLine ||
    (showTime && trust.timeLabel);

  if (!hasContent) return null;

  return (
    <div
      className="atlas-thread-trust"
      role="group"
      aria-label={labels.trustSummary}
    >
      {trust.showLive ? <LiveBadge label={labels.live} /> : null}
      {trust.showBreaking ? (
        <span className="atlas-thread-trust__badge atlas-thread-trust__badge--breaking">
          {labels.breaking}
        </span>
      ) : null}
      {trust.verified ? (
        <span className="atlas-thread-trust__badge atlas-thread-trust__badge--verified">
          {labels.verified}
        </span>
      ) : null}
      {trust.sourceLine ? (
        <span className="atlas-thread-trust__meta">{trust.sourceLine}</span>
      ) : null}
      {trust.timeLabel && showTime ? (
        <span className="atlas-thread-trust__meta">{trust.timeLabel}</span>
      ) : null}
    </div>
  );
});
