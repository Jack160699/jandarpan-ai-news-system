/**
 * Jan Darpan Reader Design System (navy / deep-red / gold) feature flags.
 *
 * Rollout is fully flag-gated so the live reader UI is untouched until enabled.
 * Enable with NEXT_PUBLIC_READER_DS=1.
 *
 * Production RC: leave unset / `0` on Production until go-live sign-off.
 * Preview: set `1` on the feature-branch Preview only.
 */

/** Enable the approved navy/red/gold reader design (default OFF). */
export function isReaderDesignSystemEnabled(): boolean {
  return process.env.NEXT_PUBLIC_READER_DS === "1";
}

/**
 * QA-only galleries (`/system/preview`, paywall-preview).
 * Available when DS is on and the runtime is not Vercel Production.
 */
export function isReaderDesignSystemQaEnabled(): boolean {
  if (!isReaderDesignSystemEnabled()) return false;
  return process.env.VERCEL_ENV !== "production";
}
