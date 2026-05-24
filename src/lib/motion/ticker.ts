/**
 * Homepage marquee motion — mirrors platform/tokens.css
 */
export const TICKER_MARQUEE = {
  TRENDING_DURATION: "38s",
  LIVE_DURATION: "38s",
  EASING: "linear",
} as const;

export const TICKER_MARQUEE_CSS_VARS = {
  trending: "--trending-marquee-duration",
  live: "--live-marquee-duration",
  easing: "--marquee-easing",
} as const;
