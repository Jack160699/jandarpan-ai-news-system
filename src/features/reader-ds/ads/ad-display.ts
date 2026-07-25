/**
 * Reader DS advertisement presentation rules.
 * Production readers never see dimension-labelled placeholders.
 * Development / explicit preview may show reserved inventory frames.
 */

export const STICKY_AD_DISMISS_KEY = "jd-sticky-ad-dismissed-v1";

/** Session-scoped sticky dismiss (survives reload within the tab session). */
export function readStickyAdDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STICKY_AD_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeStickyAdDismissed(dismissed = true): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) sessionStorage.setItem(STICKY_AD_DISMISS_KEY, "1");
    else sessionStorage.removeItem(STICKY_AD_DISMISS_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

/**
 * Preview / inventory-debug mode — dashed size labels allowed.
 * Never on for ordinary production readers.
 */
export function isAdPreviewMode(): boolean {
  if (process.env.NEXT_PUBLIC_AD_PREVIEW === "1") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export type AdRenderMode = "creative" | "preview" | "subtle" | "hidden";

/**
 * Decide how an empty (no creative) or filled slot should render.
 * - creative: real unit
 * - preview: dimension placeholder (dev/admin)
 * - subtle: CLS-safe reserved band without dimension chrome (optional)
 * - hidden: do not mount
 */
export function resolveAdRenderMode(opts: {
  hasCreative: boolean;
  /** When true and empty, keep a low-contrast reserved band for CLS. */
  reserveWhenEmpty?: boolean;
  forcePreview?: boolean;
}): AdRenderMode {
  if (opts.hasCreative) return "creative";
  if (opts.forcePreview || isAdPreviewMode()) return "preview";
  if (opts.reserveWhenEmpty) return "subtle";
  return "hidden";
}

/** Sticky units only mount with a creative or in preview — never empty chrome. */
export function shouldMountStickyAd(opts: {
  hasCreative: boolean;
  dismissed?: boolean;
  forcePreview?: boolean;
}): boolean {
  if (opts.dismissed) return false;
  const mode = resolveAdRenderMode({
    hasCreative: opts.hasCreative,
    forcePreview: opts.forcePreview,
  });
  return mode === "creative" || mode === "preview";
}
