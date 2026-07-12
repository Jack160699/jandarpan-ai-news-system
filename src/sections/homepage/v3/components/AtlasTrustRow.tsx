"use client";

import { memo, useMemo } from "react";
import { LiveBadge } from "@/components/homepage/LiveBadge";
import { formatHomeUpdated } from "@/lib/homepage/format";
import type { HomeArticle } from "@/lib/homepage/types";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/design-system/utils/cn";
import {
  deriveHomeTrustSignals,
  type HomeTrustSignal,
} from "../lib/derive-home-trust";

export type AtlasTrustRowProps = {
  article: HomeArticle;
  language: NewsroomLanguage;
  districtLabel?: string;
  suppressLive?: boolean;
  className?: string;
};

type ResolvedTrustItem = {
  key: string;
  label: string;
  ariaLabel: string;
  variant: HomeTrustSignal["kind"];
};

function resolveTrustItems(
  signals: HomeTrustSignal[],
  language: NewsroomLanguage,
  labels: {
    humanReviewed: string;
    verified: string;
    aiReviewed: string;
    live: string;
    sources: (count: number) => string;
    trustSummary: string;
    readingTime: string | null;
  }
): ResolvedTrustItem[] {
  return signals.map((signal) => {
    switch (signal.kind) {
      case "human-reviewed":
        return {
          key: signal.kind,
          label: labels.humanReviewed,
          ariaLabel: labels.humanReviewed,
          variant: signal.kind,
        };
      case "verified":
        return {
          key: signal.kind,
          label: labels.verified,
          ariaLabel: labels.verified,
          variant: signal.kind,
        };
      case "ai-reviewed":
        return {
          key: signal.kind,
          label: labels.aiReviewed,
          ariaLabel: labels.aiReviewed,
          variant: signal.kind,
        };
      case "live":
        return {
          key: signal.kind,
          label: labels.live,
          ariaLabel: labels.live,
          variant: signal.kind,
        };
      case "source-count":
        return {
          key: signal.kind,
          label: labels.sources(signal.count),
          ariaLabel: labels.sources(signal.count),
          variant: signal.kind,
        };
      case "updated":
        return {
          key: signal.kind,
          label: formatHomeUpdated(signal.iso, language),
          ariaLabel: formatHomeUpdated(signal.iso, language),
          variant: signal.kind,
        };
      case "district":
        return {
          key: signal.kind,
          label: signal.label,
          ariaLabel: signal.label,
          variant: signal.kind,
        };
      default: {
        const _exhaustive: never = signal;
        return _exhaustive;
      }
    }
  }).filter((item) => item.label);
}

export const AtlasTrustRow = memo(function AtlasTrustRow({
  article,
  language,
  districtLabel,
  suppressLive = false,
  className,
}: AtlasTrustRowProps) {
  const { t } = useLanguage();

  const rankingReasons = article.ranking?.reasons?.join(",") ?? "";

  const signals = useMemo(
    () =>
      deriveHomeTrustSignals(article, {
        districtLabel,
        suppressLive,
      }),
    [
      article.aiConfidence,
      article.categoryLabel,
      article.id,
      article.isLive,
      article.publishedAt,
      article.readingTime,
      article.section,
      article.sourceCount,
      article.urgency,
      article.ranking?.isBreaking,
      rankingReasons,
      districtLabel,
      suppressLive,
    ]
  );

  const labels = useMemo(
    () => ({
      humanReviewed: pickBilingualLabel(
        language,
        "Human Reviewed",
        "मानव समीक्षित"
      ),
      verified: t.trust.verified,
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
      readingTime: article.readingTime?.trim() || null,
    }),
    [article.readingTime, language, t.trust.verified]
  );

  const items = useMemo(
    () => resolveTrustItems(signals, language, labels),
    [signals, language, labels]
  );

  if (!items.length && !labels.readingTime) return null;

  return (
    <div
      className={cn("atlas-trust", "atlas-trust--enter", className)}
      role="group"
      aria-label={labels.trustSummary}
    >
      <div className="atlas-trust__items">
        {items.map((item) =>
          item.variant === "live" ? (
            <span key={item.key} aria-label={item.ariaLabel}>
              <LiveBadge label={item.label} />
            </span>
          ) : (
            <span
              key={item.key}
              className={cn(
                "atlas-trust__item",
                `atlas-trust__item--${item.variant}`
              )}
              aria-label={item.ariaLabel}
            >
              {item.label}
            </span>
          )
        )}
        {labels.readingTime ? (
          <span
            className="atlas-trust__read"
            aria-label={pickBilingualLabel(
              language,
              `Reading time ${labels.readingTime}`,
              `पढ़ने का समय ${labels.readingTime}`
            )}
          >
            {labels.readingTime}
          </span>
        ) : null}
      </div>
    </div>
  );
});
