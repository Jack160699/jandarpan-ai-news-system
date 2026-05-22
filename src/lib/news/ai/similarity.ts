/**
 * Text similarity — TF-IDF cosine + token overlap (embedding-ready vectors)
 */

import { titleSimilarity, normalizeTitle } from "@/lib/news/normalize";

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "and",
  "is",
  "are",
  "was",
  "were",
  "with",
  "from",
  "by",
  "as",
  "it",
  "that",
  "this",
  "be",
  "has",
  "have",
  "had",
  "will",
  "news",
  "live",
  "update",
  "latest",
  "said",
  "says",
  "according",
  "report",
  "की",
  "के",
  "में",
  "से",
  "को",
  "पर",
  "और",
  "एक",
  "यह",
  "है",
  "था",
  "थी",
  "हुआ",
  "हुई",
  "ने",
  "भी",
  "तो",
  "कि",
  "समाचार",
]);

export type SparseVector = Map<string, number>;

export function tokenizeForSimilarity(text: string): string[] {
  return normalizeTitle(text)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function buildTfIdfVector(
  tokens: string[],
  idf: Map<string, number>
): SparseVector {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const vec = new Map<string, number>();
  const max = Math.max(1, tokens.length);
  for (const [term, count] of counts) {
    const tf = count / max;
    const weight = tf * (idf.get(term) ?? 1);
    vec.set(term, weight);
  }
  return vec;
}

export function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  if (!a.size || !b.size) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const v of a.values()) normA += v * v;
  for (const v of b.values()) normB += v * v;

  const smaller = a.size < b.size ? a : b;
  const larger = a.size < b.size ? b : a;

  for (const [key, va] of smaller) {
    const vb = larger.get(key);
    if (vb != null) dot += va * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

export function tokenOverlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  let inter = 0;
  for (const w of a) {
    if (setB.has(w)) inter++;
  }
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}

export function computeIdf(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const n = documents.length;
  for (const doc of documents) {
    const seen = new Set(doc);
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
  }
  return idf;
}

export function combinedStorySimilarity(input: {
  titleA: string;
  titleB: string;
  textA: string;
  textB: string;
  tokensA: string[];
  tokensB: string[];
  vectorA: SparseVector;
  vectorB: SparseVector;
  entityOverlap: number;
  categoryMatch: boolean;
  regionMatch: boolean;
  hoursApart: number;
}): number {
  const titleSim = titleSimilarity(input.titleA, input.titleB);
  const cosine = cosineSimilarity(input.vectorA, input.vectorB);
  const keyword = tokenOverlapScore(input.tokensA, input.tokensB);
  const entity = input.entityOverlap;
  const meta =
    (input.categoryMatch ? 0.05 : 0) + (input.regionMatch ? 0.05 : 0);
  const timePenalty = Math.min(0.2, input.hoursApart / 120);

  const blended =
    0.32 * titleSim +
    0.28 * cosine +
    0.18 * keyword +
    0.12 * entity +
    meta -
    timePenalty;

  return Math.max(0, Math.min(1, blended));
}
