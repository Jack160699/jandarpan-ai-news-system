/**
 * Jan Darpan Reader Design System (navy / deep-red / gold) feature flags.
 *
 * Rollout is fully flag-gated so the live reader UI is untouched until enabled.
 * Enable with NEXT_PUBLIC_READER_DS=1.
 */

/** Enable the approved navy/red/gold reader design (default OFF). */
export function isReaderDesignSystemEnabled(): boolean {
  return process.env.NEXT_PUBLIC_READER_DS === "1";
}
