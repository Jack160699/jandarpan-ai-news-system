/**
 * Readability-first marquee timing — ~12–18s for a headline to cross the viewport
 */

/** Seconds for one headline (width + viewport) to scroll fully across */
export function headlineCrossSeconds(headlineWidthPx: number): number {
  if (headlineWidthPx < 180) return 12;
  if (headlineWidthPx < 320) return 14;
  if (headlineWidthPx < 480) return 16;
  return 18;
}

/** Pixels per second — derived from longest headline in the set */
export function marqueePixelsPerSecond(
  viewportWidthPx: number,
  maxHeadlineWidthPx: number,
  isMobile: boolean
): number {
  const crossSec = headlineCrossSeconds(maxHeadlineWidthPx);
  const distance = viewportWidthPx + maxHeadlineWidthPx;
  let pxPerSec = distance / crossSec;
  if (isMobile) pxPerSec *= 0.82;
  return Math.max(18, Math.min(36, pxPerSec));
}

/** Duration for one full loop (half duplicated track width) */
export function marqueeLoopDurationSeconds(
  loopWidthPx: number,
  viewportWidthPx: number,
  maxHeadlineWidthPx: number,
  isMobile: boolean
): number {
  if (loopWidthPx <= 0 || viewportWidthPx <= 0) return 120;
  const pxPerSec = marqueePixelsPerSecond(
    viewportWidthPx,
    maxHeadlineWidthPx,
    isMobile
  );
  const seconds = loopWidthPx / pxPerSec;
  return Math.min(420, Math.max(80, seconds));
}
