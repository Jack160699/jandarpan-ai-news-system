/**
 * JDP-004 — Article Experience V3 feature flags
 */

/** Enable Article Experience V3 (default OFF — set NEXT_PUBLIC_ARTICLE_V3=1) */
export function isArticleV3Enabled(): boolean {
  return process.env.NEXT_PUBLIC_ARTICLE_V3 === "1";
}
