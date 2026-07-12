"use client";

import { memo, useMemo } from "react";
import { LiveBadge } from "@/components/homepage/LiveBadge";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";
import { deriveStoryTrustSignals } from "../lib/derive-story-trust";

type AtlasStoryTrustRowProps = {
  intelligence: Pick<
    StoryIntelligenceVm,
    "trust" | "attribution" | "reader" | "knowledge"
  >;
  language: NewsroomLanguage;
  isLive: boolean;
  readTime?: string | null;
  suppressLive?: boolean;
};

export const AtlasStoryTrustRow = memo(function AtlasStoryTrustRow({
  intelligence,
  language,
  isLive,
  readTime,
  suppressLive,
}: AtlasStoryTrustRowProps) {
  const signals = useMemo(
    () => deriveStoryTrustSignals({ intelligence, isLive, suppressLive }),
    [intelligence, isLive, suppressLive]
  );

  const labels = useMemo(
    () => ({
      humanReviewed: pickBilingualLabel(
        language,
        "Human Reviewed",
        "मानव समीक्षित"
      ),
      verified: pickBilingualLabel(language, "Verified", "सत्यापित"),
      aiReviewed: pickBilingualLabel(language, "AI Reviewed", "AI समीक्षित"),
      live: pickBilingualLabel(language, "Live", "लाइव"),
      sources: (count: number) =>
        pickBilingualLabel(
          language,
          `${count} Source${count === 1 ? "" : "s"}`,
          `${count} स्रोत`
        ),
      trustSummary: pickBilingualLabel(
        language,
        "Story trust information",
        "कहानी विश्वसनीयता जानकारी"
      ),
    }),
    [language]
  );

  if (!signals.length && !readTime?.trim()) return null;

  return (
    <div
      className="atlas-story-trust atlas-trust--enter"
      role="group"
      aria-label={labels.trustSummary}
    >
      <div className="atlas-story-trust__items">
        {signals.map((signal) => {
          if (signal.kind === "human-reviewed") {
            return (
              <span
                key={signal.kind}
                className="atlas-story-trust__badge"
                aria-label={labels.humanReviewed}
              >
                {labels.humanReviewed}
              </span>
            );
          }
          if (signal.kind === "verified") {
            return (
              <span
                key={signal.kind}
                className="atlas-story-trust__badge atlas-story-trust__badge--verified"
                aria-label={labels.verified}
              >
                {labels.verified}
              </span>
            );
          }
          if (signal.kind === "ai-reviewed") {
            return (
              <span
                key={signal.kind}
                className="atlas-story-trust__badge"
                aria-label={labels.aiReviewed}
              >
                {labels.aiReviewed}
              </span>
            );
          }
          if (signal.kind === "live") {
            return (
              <span key={signal.kind} aria-label={labels.live}>
                <LiveBadge label={labels.live} />
              </span>
            );
          }
          if (signal.kind === "source-count") {
            const label = labels.sources(signal.count);
            return (
              <span
                key={signal.kind}
                className="atlas-story-trust__meta"
                aria-label={label}
              >
                {label}
              </span>
            );
          }
          if (signal.kind === "updated") {
            return (
              <span
                key={signal.kind}
                className="atlas-story-trust__meta"
                aria-label={signal.label}
              >
                {signal.label}
              </span>
            );
          }
          if (signal.kind === "district") {
            return (
              <span
                key={signal.kind}
                className="atlas-story-trust__meta"
                aria-label={signal.label}
              >
                {signal.label}
              </span>
            );
          }
          const _exhaustive: never = signal;
          return _exhaustive;
        })}
        {readTime?.trim() ? (
          <span
            className="atlas-story-trust__read"
            aria-label={pickBilingualLabel(
              language,
              `Reading time ${readTime}`,
              `पढ़ने का समय ${readTime}`
            )}
          >
            {readTime}
          </span>
        ) : null}
      </div>
    </div>
  );
});
