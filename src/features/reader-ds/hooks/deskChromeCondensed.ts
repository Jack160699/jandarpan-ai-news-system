/**
 * DeskChrome condensed-state resolver with enter/exit hysteresis.
 *
 * Production bug: a hard `scrollY > 72` threshold plus `display:none` on the
 * full header collapsed ~117px of sticky layout, which yanked scrollY toward 0
 * and flipped condensed off again — visible flicker in the 72–188px band.
 *
 * Hysteresis alone stops oscillation; the CSS companion keeps layout height
 * stable so scrollY stays monotonic through the trigger region.
 */

/** Enter condensed once scroll passes this (px). ≈ full desk chrome height. */
export const DESK_CHROME_ENTER_Y = 160;

/** Exit condensed only after scroll falls below this (px). */
export const DESK_CHROME_EXIT_Y = 40;

/** Condensed mode CSS applies at this viewport width and above. */
export const DESK_CHROME_CONDENSED_MQ = "(min-width: 1280px)";

export function resolveDeskChromeCondensed(
  scrollY: number,
  currentlyCondensed: boolean,
  enterY: number = DESK_CHROME_ENTER_Y,
  exitY: number = DESK_CHROME_EXIT_Y
): boolean {
  const y = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  if (currentlyCondensed) {
    return y >= exitY;
  }
  return y > enterY;
}
