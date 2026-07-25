import {
  JAN_DARPAN_BRAND_ASSETS,
  JAN_DARPAN_COMPACT_LOGO_INTRINSIC,
} from "@/lib/brand/assets";

/**
 * Masthead lockup optical size — preserves 230×48 aspect.
 * Intrinsic attrs reserve layout (CLS); CSS clamp adapts 320–430px phones.
 */
export const MASTHEAD_LOGO_DISPLAY = {
  /** Layout reservation / max optical width at ≥390px (230×48 aspect) */
  width: 153,
  height: 32,
} as const;

/** Responsive CSS width — never exceeds reserved box. */
export const MASTHEAD_LOGO_CSS_WIDTH = "clamp(142px, 40vw, 153px)";

type MastheadBrandLogoProps = {
  alt: string;
  className?: string;
};

/**
 * Approved compact-dark lockup for the navy phone masthead.
 * Uses the brand lockup path only — never tab icons. Fixed dims prevent CLS.
 */
export function MastheadBrandLogo({ alt, className }: MastheadBrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG lockup; fixed dims for CLS
    <img
      src={JAN_DARPAN_BRAND_ASSETS.logoCompactDark}
      alt={alt}
      width={MASTHEAD_LOGO_DISPLAY.width}
      height={MASTHEAD_LOGO_DISPLAY.height}
      className={className}
      data-testid="jd-masthead-logo"
      data-jd-brand-asset="compact-dark"
      decoding="async"
      style={{
        width: MASTHEAD_LOGO_CSS_WIDTH,
        height: "auto",
        maxWidth: MASTHEAD_LOGO_DISPLAY.width,
        maxHeight: MASTHEAD_LOGO_DISPLAY.height,
        aspectRatio: `${JAN_DARPAN_COMPACT_LOGO_INTRINSIC.width} / ${JAN_DARPAN_COMPACT_LOGO_INTRINSIC.height}`,
        display: "block",
        objectFit: "contain",
        objectPosition: "left center",
        flexShrink: 1,
      }}
      // Intrinsic hint for browsers (aspect from approved viewBox)
      {...{
        "data-intrinsic-w": String(JAN_DARPAN_COMPACT_LOGO_INTRINSIC.width),
        "data-intrinsic-h": String(JAN_DARPAN_COMPACT_LOGO_INTRINSIC.height),
      }}
    />
  );
}
