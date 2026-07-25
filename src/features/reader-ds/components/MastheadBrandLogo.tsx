import {
  JAN_DARPAN_BRAND_ASSETS,
  JAN_DARPAN_COMPACT_LOGO_INTRINSIC,
} from "@/lib/brand/assets";

/** Display size for phone masthead — preserves 230×48 aspect, avoids CLS. */
export const MASTHEAD_LOGO_DISPLAY = {
  width: 134,
  height: 28,
} as const;

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
        width: MASTHEAD_LOGO_DISPLAY.width,
        height: MASTHEAD_LOGO_DISPLAY.height,
        display: "block",
        objectFit: "contain",
        objectPosition: "left center",
        flexShrink: 0,
      }}
      // Intrinsic hint for browsers (aspect from approved viewBox)
      {...{
        "data-intrinsic-w": String(JAN_DARPAN_COMPACT_LOGO_INTRINSIC.width),
        "data-intrinsic-h": String(JAN_DARPAN_COMPACT_LOGO_INTRINSIC.height),
      }}
    />
  );
}
