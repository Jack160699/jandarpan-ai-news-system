/**
 * Reserved advertisement slots — SoT sizes, labelled only in preview.
 * Production without a creative: hidden or subtle reserved band (no fake ads).
 */

import type { ReactNode } from "react";
import { resolveAdRenderMode } from "../ads/ad-display";

export type ReservedAdFormat =
  | "leaderboard"
  | "billboard"
  | "sidebar"
  | "skyscraper"
  | "inline"
  | "tablet"
  | "tabletLeader"
  | "infeed"
  | "sponsor"
  | "sticky";

export type AdPlacementId =
  | "home.leaderboard"
  | "home.sidebar"
  | "home.infeed"
  | "home.billboard"
  | "home.sponsor"
  | "home.sticky"
  | "category.skyscraper"
  | "article.inline"
  | "article.sidebar"
  | "tablet.adaptive";

const FORMAT: Record<
  ReservedAdFormat,
  { w: number; h: number; label: string; labelEn: string; subtleH: number }
> = {
  leaderboard: {
    w: 728,
    h: 90,
    label: "विज्ञापन · 728×90",
    labelEn: "Ad · 728×90",
    subtleH: 90,
  },
  billboard: {
    w: 970,
    h: 250,
    label: "विज्ञापन · 970×250",
    labelEn: "Ad · 970×250",
    subtleH: 120,
  },
  sidebar: {
    w: 300,
    h: 250,
    label: "विज्ञापन · 300×250",
    labelEn: "Ad · 300×250",
    subtleH: 250,
  },
  skyscraper: {
    w: 300,
    h: 600,
    label: "विज्ञापन · 300×600",
    labelEn: "Ad · 300×600",
    subtleH: 300,
  },
  inline: {
    w: 580,
    h: 300,
    label: "विज्ञापन · 580×300",
    labelEn: "Ad · 580×300",
    subtleH: 120,
  },
  tablet: {
    w: 468,
    h: 60,
    label: "विज्ञापन · 468×60",
    labelEn: "Ad · 468×60",
    subtleH: 60,
  },
  tabletLeader: {
    w: 728,
    h: 90,
    label: "विज्ञापन · 728×90",
    labelEn: "Ad · 728×90",
    subtleH: 90,
  },
  infeed: {
    w: 300,
    h: 250,
    label: "विज्ञापन · इन-फ़ीड",
    labelEn: "Ad · In-feed",
    subtleH: 96,
  },
  sponsor: {
    w: 728,
    h: 90,
    label: "प्रायोजित खंड · 728×90",
    labelEn: "Sponsored · 728×90",
    subtleH: 72,
  },
  sticky: {
    w: 320,
    h: 50,
    label: "स्टिकी बैनर · 320×50",
    labelEn: "Sticky · 320×50",
    subtleH: 50,
  },
};

export function ReservedAd({
  format = "leaderboard",
  locale = "hi",
  className = "",
  placementId,
  sticky = false,
  children,
  reserveWhenEmpty = false,
  forcePreview,
}: {
  format?: ReservedAdFormat;
  locale?: "hi" | "en";
  className?: string;
  placementId?: AdPlacementId;
  sticky?: boolean;
  /** Real creative — never fabricate advertisers. */
  children?: ReactNode;
  /** Keep a low-contrast band when empty (CLS). Default: hide empty slots. */
  reserveWhenEmpty?: boolean;
  forcePreview?: boolean;
}) {
  const spec = FORMAT[format];
  const hasCreative = Boolean(children);
  const mode = resolveAdRenderMode({
    hasCreative,
    reserveWhenEmpty,
    forcePreview,
  });

  if (mode === "hidden") return null;

  const aria = locale === "en" ? "Advertisement" : "विज्ञापन";
  const height = mode === "subtle" ? spec.subtleH : spec.h;

  return (
    <aside
      className={`jd-reserved-ad jd-reserved-ad--${format}${sticky ? " jd-reserved-ad--sticky" : ""} jd-reserved-ad--${mode} ${className}`.trim()}
      data-testid="jd-reserved-ad"
      data-jd-ad-placement={placementId ?? format}
      data-jd-ad-mode={mode}
      role="complementary"
      aria-label={aria}
      style={{
        width: "100%",
        maxWidth: spec.w,
        marginLeft: "auto",
        marginRight: "auto",
        minHeight: height,
        height: mode === "creative" ? "auto" : height,
        background: mode === "subtle" ? "var(--jd-paper-2)" : "var(--jd-paper-2)",
        border:
          mode === "preview" ? "1px dashed var(--jd-muted)" : "1px solid transparent",
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {mode === "creative" ? (
        children
      ) : mode === "preview" ? (
        <>
          <span
            className="jd-ui"
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--jd-muted)",
            }}
          >
            {aria}
          </span>
          <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-ink-3)" }}>
            {locale === "en" ? spec.labelEn : spec.label}
          </span>
        </>
      ) : (
        <span className="sr-only">{aria}</span>
      )}
    </aside>
  );
}

export const AD_FORMAT_SPECS = FORMAT;
