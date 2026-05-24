/**
 * Article normalization, validation, dedupe (URL + fuzzy title)
 */

import { createHash } from "crypto";
import type { NormalizedArticle } from "@/lib/news/types";
import { detectLanguage } from "@/lib/news/language";
import { isValidNewsArticle } from "@/lib/news/sanitize-article";

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Strip tracking params and normalize host/path for dedupe */
export function canonicalArticleUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    const stripParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "mc_cid",
      "mc_eid",
    ];
    for (const p of stripParams) u.searchParams.delete(p);
    u.hostname = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname}${path}${u.search ? `?${u.searchParams.toString()}` : ""}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[«»""'']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function titleHash(title: string): string {
  return createHash("sha256").update(normalizeTitle(title)).digest("hex");
}

export function urlHash(url: string): string {
  return createHash("sha256")
    .update(canonicalArticleUrl(url))
    .digest("hex");
}

const REMOVED_TITLES = new Set([
  "[removed]",
  "removed",
  "untitled",
  "no title",
  "बिना शीर्षक",
]);

const DEMO_TITLE_RE =
  /lorem ipsum|sample story|concept demo|placeholder|test headline|demo news/i;

const PLACEHOLDER_IMAGE_RE =
  /placeholder|placehold\.co|via\.placeholder|default\.(jpg|png)|no-?image|1x1\.|pixel\.gif|avatar|favicon|logo\.(png|jpg)|unsplash\.com\/photo-1(pH|vOZ)|dummyimage/i;

export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return true;
  return PLACEHOLDER_IMAGE_RE.test(lower);
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  const n = normalizeTitle(s);
  for (let i = 0; i < n.length - 1; i++) {
    set.add(n.slice(i, i + 2));
  }
  return set;
}

/** Jaccard similarity on character bigrams (0–1) */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (na.length > 8 && nb.length > 8) {
    if (na.includes(nb) || nb.includes(na)) {
      const shorter = na.length < nb.length ? na : nb;
      const longer = na.length < nb.length ? nb : na;
      if (shorter.length / longer.length >= 0.75) return 0.92;
    }
  }

  const ba = bigrams(a);
  const bb = bigrams(b);
  if (!ba.size || !bb.size) return 0;

  let inter = 0;
  for (const x of ba) {
    if (bb.has(x)) inter++;
  }
  const union = ba.size + bb.size - inter;
  return union ? inter / union : 0;
}

const FUZZY_THRESHOLD = 0.88;

export type ValidateOptions = {
  strictRss?: boolean;
  maxAgeDays?: number;
};

/** @deprecated Prefer isValidNewsArticle — sanitizes first, soft failures only */
export function validateArticle(
  article: NormalizedArticle,
  _options: ValidateOptions = {}
): { valid: boolean; reason?: string } {
  const result = isValidNewsArticle(article);
  if (result.valid) return { valid: true };
  return { valid: false, reason: result.fatalErrors[0] ?? "invalid" };
}

export type DedupeResult = {
  unique: NormalizedArticle[];
  skipped: number;
  fuzzySkipped: number;
};

export function dedupeArticles(
  articles: NormalizedArticle[],
  options?: { fuzzy?: boolean }
): DedupeResult {
  const seenUrls = new Set<string>();
  const seenHashes = new Set<string>();
  const keptTitles: string[] = [];
  const unique: NormalizedArticle[] = [];
  let skipped = 0;
  let fuzzySkipped = 0;
  const useFuzzy = options?.fuzzy !== false;

  const sorted = [...articles].sort(
    (a, b) =>
      ((b as NormalizedArticle & { _priority?: number })._priority ?? 0) -
      ((a as NormalizedArticle & { _priority?: number })._priority ?? 0)
  );

  for (const article of sorted) {
    const urlKey = canonicalArticleUrl(article.article_url);
    const tHash = titleHash(article.title);

    if (seenUrls.has(urlKey) || seenHashes.has(tHash)) {
      skipped++;
      continue;
    }

    if (useFuzzy) {
      let fuzzyDup = false;
      for (const existing of keptTitles) {
        if (titleSimilarity(article.title, existing) >= FUZZY_THRESHOLD) {
          fuzzyDup = true;
          break;
        }
      }
      if (fuzzyDup) {
        fuzzySkipped++;
        skipped++;
        continue;
      }
    }

    seenUrls.add(urlKey);
    seenHashes.add(tHash);
    keptTitles.push(article.title);
    unique.push({
      ...article,
      article_url: urlKey,
      language:
        article.language ??
        detectLanguage(`${article.title} ${article.description ?? ""}`),
    });
  }

  return { unique, skipped, fuzzySkipped };
}

export function parsePublishedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
