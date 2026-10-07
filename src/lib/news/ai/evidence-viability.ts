/**
 * Pre-generation evidence viability -- keeps scarce CodeCraft capacity off candidates that cannot reach the depth gate.
 *
 * The depth gate (editorial-depth-quality.ts) is unchanged: a draft must still reach depthRejectThreshold(type) words.
 * The writer may only use facts in the fact pack, so a type whose floor is far larger than the fact pack can never be met
 * without padding or invention -- it only produces a paid first draft, a paid depth retry, and a rejection.
 *
 * This module decides BEFORE the model call, using the existing "demote rather than pad" ladder
 * (standard_report -> short_update, developing_story -> short_update, ...). It never relabels a story as breaking_alert and
 * never lowers a floor: the demoted type keeps its own full floor.
 *
 * Production audit (100 generated articles): the smallest fact pack that produced a published article was ~800 chars
 * (breaking_alert) / ~916 chars (short_update). The default ratio below (3.0 fact-pack chars per floor word) therefore only
 * stops candidates well below anything that has ever published. Tune with EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD.
 */

import { ARTICLE_DEPTH_RULES, depthRejectThreshold, type ArticleType } from "@/lib/news/ai/article-type";

export const DEFAULT_FACTPACK_CHARS_PER_FLOOR_WORD = 3.0;

/** Never demote an ordinary story into breaking_alert: that label needs real urgency, not thin evidence. */
const DEMOTION_STOP: ReadonlySet<ArticleType> = new Set<ArticleType>(["short_update", "breaking_alert"]);

type EnvLike = Record<string, string | undefined>;

export function factPackCharsPerFloorWord(env: EnvLike = process.env): number {
  const raw = env.EDITORIAL_FACTPACK_CHARS_PER_FLOOR_WORD?.trim();
  if (!raw) return DEFAULT_FACTPACK_CHARS_PER_FLOOR_WORD;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FACTPACK_CHARS_PER_FLOOR_WORD;
}

export function minFactPackCharsForType(type: ArticleType, env: EnvLike = process.env): number {
  return Math.ceil(depthRejectThreshold(type) * factPackCharsPerFloorWord(env));
}

export type EvidenceViability = {
  viable: boolean;
  /** Type to generate as (equals the input type unless demoted). */
  articleType: ArticleType;
  demotedFrom: ArticleType | null;
  factPackChars: number;
  requiredChars: number;
  /** null when viable */
  reason: string | null;
};

export function assessEvidenceViability(input: {
  articleType: ArticleType;
  factPackChars: number;
  env?: EnvLike;
}): EvidenceViability {
  const env = input.env ?? process.env;
  const chars = Math.max(0, Math.floor(input.factPackChars || 0));
  const start = input.articleType;
  const seen = new Set<ArticleType>();
  let type = start;

  for (;;) {
    seen.add(type);
    const required = minFactPackCharsForType(type, env);
    if (chars >= required) {
      return {
        viable: true,
        articleType: type,
        demotedFrom: type === start ? null : start,
        factPackChars: chars,
        requiredChars: required,
        reason: null,
      };
    }
    const next = ARTICLE_DEPTH_RULES[type].insufficientFallback;
    if (DEMOTION_STOP.has(type) || next === type || seen.has(next)) {
      return {
        viable: false,
        articleType: type,
        demotedFrom: type === start ? null : start,
        factPackChars: chars,
        requiredChars: required,
        reason: `evidence_below_floor:${type}:${chars}<${required}`,
      };
    }
    type = next;
  }
}
