/**
 * Deterministic input planning for embedding requests (pure; no I/O).
 *
 * Why: a clustering batch reached Cloudflare as ~77,841 tokens against the model's 60,000-token context limit and the
 * provider answered 400 ("Max context reached"). The request was never size-checked, and the repo's token estimate
 * (chars/4) badly undercounts Devanagari, so a "small" estimate hid an oversized request.
 *
 * Guarantees of planEmbeddingInput():
 *  - no single text exceeds EMBEDDING_TEXT_TOKEN_CAP (conservative tokens) - it is truncated at a fixed character
 *    boundary, so the same input always yields the same reduction;
 *  - no request exceeds the request budget (conservative tokens, a fraction of the provider limit) - the batch is
 *    split in input order, so vectors can be re-joined positionally;
 *  - the decision is returned (and logged by the caller): truncated text count, chunk count, token totals.
 */

/** Provider hard limit for the model's context (bge-m3 on Workers AI). Requests above this are rejected with a 400. */
export const EMBEDDING_PROVIDER_MAX_TOKENS = 60_000;

/** Default per-request budget in CONSERVATIVE tokens: well under the provider limit so estimator error cannot reach it. */
export const EMBEDDING_REQUEST_TOKEN_BUDGET = 24_000;

/** Default per-text cap in conservative tokens (a headline + summary is far below this; bodies are cut). */
export const EMBEDDING_TEXT_TOKEN_CAP = 1_500;

/** Hard ceiling on texts per request, independent of tokens. */
export const EMBEDDING_MAX_TEXTS_PER_REQUEST = 32;

/**
 * Deliberately pessimistic token estimate: ASCII text ~1 token / 3 chars; any non-ASCII char (Devanagari, etc.) is
 * counted as a full token (SentencePiece splits Indic scripts into many short pieces). Over-estimates on purpose.
 */
export function conservativeEmbeddingTokens(text: string): number {
  let ascii = 0;
  let wide = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) < 128) ascii++;
    else wide++;
  }
  return Math.ceil(ascii / 3) + wide;
}

export type EmbeddingLimits = { requestTokenBudget: number; textTokenCap: number; maxTexts: number };

/** Limits from env, always clamped so a misconfiguration can never exceed the provider limit. */
export function embeddingLimits(env: Record<string, string | undefined> = process.env): EmbeddingLimits {
  const num = (k: string, d: number, min: number, max: number) => {
    const v = Number(env[k]);
    return Number.isFinite(v) && v >= min ? Math.min(max, Math.floor(v)) : d;
  };
  const requestTokenBudget = num("CLOUDFLARE_EMBEDDING_MAX_REQUEST_TOKENS", EMBEDDING_REQUEST_TOKEN_BUDGET, 500, Math.floor(EMBEDDING_PROVIDER_MAX_TOKENS * 0.5));
  const textTokenCap = Math.min(num("CLOUDFLARE_EMBEDDING_MAX_TEXT_TOKENS", EMBEDDING_TEXT_TOKEN_CAP, 50, 8_000), requestTokenBudget);
  return { requestTokenBudget, textTokenCap, maxTexts: num("CLOUDFLARE_EMBEDDING_MAX_TEXTS", EMBEDDING_MAX_TEXTS_PER_REQUEST, 1, 96) };
}

/** Longest prefix of `text` whose conservative token count is <= cap (deterministic). */
export function truncateToTokenCap(text: string, cap: number): string {
  if (conservativeEmbeddingTokens(text) <= cap) return text;
  let tokens = 0;
  let end = 0;
  for (; end < text.length; end++) {
    const add = text.charCodeAt(end) < 128 ? 1 / 3 : 1;
    if (Math.ceil(tokens + add) > cap) break;
    tokens += add;
  }
  return text.slice(0, end);
}

export type EmbeddingBatch = { indices: number[]; texts: string[]; estimatedTokens: number };

export type EmbeddingPlan = {
  batches: EmbeddingBatch[];
  limits: EmbeddingLimits;
  inputTexts: number;
  truncatedTexts: number;
  originalEstimatedTokens: number;
  plannedEstimatedTokens: number;
  /** True when the plan differs from "one request with the unmodified input". */
  reduced: boolean;
};

export function planEmbeddingInput(texts: readonly string[], limits: EmbeddingLimits = embeddingLimits()): EmbeddingPlan {
  const capped: string[] = [];
  let truncatedTexts = 0;
  let originalEstimatedTokens = 0;
  for (const t of texts) {
    originalEstimatedTokens += conservativeEmbeddingTokens(t);
    const c = truncateToTokenCap(t, limits.textTokenCap);
    if (c.length !== t.length) truncatedTexts++;
    capped.push(c);
  }

  const batches: EmbeddingBatch[] = [];
  let current: EmbeddingBatch = { indices: [], texts: [], estimatedTokens: 0 };
  for (let i = 0; i < capped.length; i++) {
    const tokens = conservativeEmbeddingTokens(capped[i]!);
    const wouldOverflow = current.texts.length > 0 && (current.estimatedTokens + tokens > limits.requestTokenBudget || current.texts.length >= limits.maxTexts);
    if (wouldOverflow) {
      batches.push(current);
      current = { indices: [], texts: [], estimatedTokens: 0 };
    }
    current.indices.push(i);
    current.texts.push(capped[i]!);
    current.estimatedTokens += tokens;
  }
  if (current.texts.length) batches.push(current);

  const plannedEstimatedTokens = batches.reduce((a, b) => a + b.estimatedTokens, 0);
  return {
    batches,
    limits,
    inputTexts: texts.length,
    truncatedTexts,
    originalEstimatedTokens,
    plannedEstimatedTokens,
    reduced: truncatedTexts > 0 || batches.length > 1,
  };
}
