/**
 * Reserved advertisement slots — SoT sizes, labelled, no fake news content.
 * placementId documents SoT inventory mapping for formal review.
 */

export type ReservedAdFormat =
  | "leaderboard"
  | "billboard"
  | "sidebar"
  | "skyscraper"
  | "inline"
  | "tablet"
  | "tabletLeader"
  | "infeed"
  | "sponsor";

export type AdPlacementId =
  | "home.leaderboard"
  | "home.sidebar"
  | "home.infeed"
  | "home.billboard"
  | "home.sponsor"
  | "category.skyscraper"
  | "article.inline"
  | "article.sidebar"
  | "tablet.adaptive";

const FORMAT: Record<
  ReservedAdFormat,
  { w: number; h: number; label: string; labelEn: string }
> = {
  leaderboard: { w: 728, h: 90, label: "विज्ञापन · 728×90", labelEn: "Ad · 728×90" },
  billboard: { w: 970, h: 250, label: "विज्ञापन · 970×250", labelEn: "Ad · 970×250" },
  sidebar: { w: 300, h: 250, label: "विज्ञापन · 300×250", labelEn: "Ad · 300×250" },
  skyscraper: { w: 300, h: 600, label: "विज्ञापन · 300×600", labelEn: "Ad · 300×600" },
  inline: { w: 580, h: 300, label: "विज्ञापन · 580×300", labelEn: "Ad · 580×300" },
  tablet: { w: 468, h: 60, label: "विज्ञापन · 468×60", labelEn: "Ad · 468×60" },
  tabletLeader: { w: 728, h: 90, label: "विज्ञापन · 728×90", labelEn: "Ad · 728×90" },
  infeed: { w: 300, h: 250, label: "विज्ञापन · इन-फ़ीड", labelEn: "Ad · In-feed" },
  sponsor: { w: 728, h: 90, label: "प्रायोजित खंड · 728×90", labelEn: "Sponsored · 728×90" },
};

export function ReservedAd({
  format = "leaderboard",
  locale = "hi",
  className = "",
  placementId,
  sticky = false,
}: {
  format?: ReservedAdFormat;
  locale?: "hi" | "en";
  className?: string;
  placementId?: AdPlacementId;
  sticky?: boolean;
}) {
  const spec = FORMAT[format];
  return (
    <aside
      className={`jd-reserved-ad jd-reserved-ad--${format}${sticky ? " jd-reserved-ad--sticky" : ""} ${className}`.trim()}
      data-jd-ad-placement={placementId ?? format}
      role="complementary"
      aria-label={locale === "en" ? "Advertisement" : "विज्ञापन"}
      style={{
        width: "100%",
        maxWidth: spec.w,
        marginLeft: "auto",
        marginRight: "auto",
        minHeight: spec.h,
        height: spec.h,
        background: "var(--jd-paper-2)",
        border: "1px dashed var(--jd-muted)",
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
        {locale === "en" ? "Advertisement" : "विज्ञापन"}
      </span>
      <span className="jd-ui" style={{ fontSize: 11, color: "var(--jd-ink-3)" }}>
        {locale === "en" ? spec.labelEn : spec.label}
      </span>
    </aside>
  );
}

export const AD_FORMAT_SPECS = FORMAT;
