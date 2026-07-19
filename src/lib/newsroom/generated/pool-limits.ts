/**
 * Phase 6 — hard caps for generated_articles pool reads.
 * Health/admin must never scan hundreds of full article rows.
 */

export const GENERATED_POOL_HARD_CAPS = {
  full: 120,
  homepage: 160,
  sitemap: 400,
  slug: 400,
  summary: 1,
  googleNews: 200,
} as const;

export type GeneratedPoolSelectMode =
  | "full"
  | "homepage"
  | "sitemap"
  | "slug"
  | "summary";

export function clampGeneratedPoolLimit(
  requested: number,
  mode: GeneratedPoolSelectMode
): number {
  const cap = GENERATED_POOL_HARD_CAPS[mode];
  const n = Number.isFinite(requested) ? Math.floor(requested) : cap;
  return Math.max(1, Math.min(n, cap));
}

export function isStatementTimeoutError(message: string | null | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("57014") ||
    m.includes("statement timeout") ||
    m.includes("canceling statement due to statement timeout") ||
    m.includes("query_timeout_")
  );
}
