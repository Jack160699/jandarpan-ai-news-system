/**
 * Resilient article sanitization + soft validation before DB upsert
 */

import { createHash } from "crypto";
import { canonicalArticleUrl, isPlaceholderImage, isValidHttpUrl } from "@/lib/news/normalize";
import { buildArticleSlug } from "@/lib/news/slug";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";
import { NEWS_INGEST_CATEGORIES } from "@/lib/types/news-article";

const MAX_TITLE = 500;
const MAX_DESCRIPTION = 4000;
const MAX_CONTENT = 12_000;
const MIN_TITLE_LEN = 4;

const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ã /g, "à"],
  [/Ã¢/g, "â"],
  [/Ã®/g, "î"],
  [/Ã´/g, "ô"],
  [/Ã»/g, "û"],
  [/Ã¤/g, "ä"],
  [/Ã¶/g, "ö"],
  [/Ã¼/g, "ü"],
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/â€"/g, "—"],
  [/â€"/g, "–"],
  [/Â /g, " "],
  [/Â/g, ""],
  [/â¦/g, "…"],
];

const REMOVED_TITLES = new Set([
  "[removed]",
  "removed",
  "untitled",
  "no title",
  "बिना शीर्षक",
]);

const DEMO_TITLE_RE =
  /lorem ipsum|sample story|concept demo|placeholder|test headline|demo news/i;

export type ValidationReasonCount = Record<string, number>;

export type ArticleValidationStats = {
  total: number;
  sanitized: number;
  softFixed: number;
  rejected: number;
  reasons: ValidationReasonCount;
};

export type ArticleValidationResult = {
  valid: boolean;
  sanitizedArticle: NormalizedArticle | null;
  warnings: string[];
  fatalErrors: string[];
};

function emptyStats(): ArticleValidationStats {
  return { total: 0, sanitized: 0, softFixed: 0, rejected: 0, reasons: {} };
}

export function mergeValidationStats(
  target: ArticleValidationStats,
  source: ArticleValidationStats
): void {
  target.total += source.total;
  target.sanitized += source.sanitized;
  target.softFixed += source.softFixed;
  target.rejected += source.rejected;
  for (const [k, v] of Object.entries(source.reasons)) {
    target.reasons[k] = (target.reasons[k] ?? 0) + v;
  }
}

function bumpReason(stats: ArticleValidationStats | null, reason: string): void {
  if (!stats) return;
  stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
}

/** Repair common RSS/provider UTF-8 mojibake */
export function normalizeNewsEncoding(text: string | null | undefined): string {
  if (!text) return "";
  let s = String(text);
  for (const [re, rep] of MOJIBAKE_REPLACEMENTS) {
    s = s.replace(re, rep);
  }
  s = s
    .replace(/\uFFFD/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .normalize("NFC");
  return s.replace(/\s+/g, " ").trim();
}

export function safeParsePublishedAt(
  value: string | null | undefined
): string {
  if (!value) return new Date().toISOString();
  const trimmed = normalizeNewsEncoding(value);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  const year = d.getUTCFullYear();
  if (year < 1990 || year > 2100) return new Date().toISOString();
  return d.toISOString();
}

export function safeImageUrl(
  url: string | null | undefined,
  articleUrl?: string
): string | null {
  if (!url) return null;
  const cleaned = normalizeNewsEncoding(url).replace(/\s/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("//")) {
    const fixed = `https:${cleaned}`;
    return isValidHttpUrl(fixed) && !isPlaceholderImage(fixed) ? fixed : null;
  }
  if (isValidHttpUrl(cleaned) && !isPlaceholderImage(cleaned)) {
    return cleaned;
  }
  try {
    if (articleUrl && isValidHttpUrl(articleUrl)) {
      const resolved = new URL(cleaned, articleUrl).toString();
      if (isValidHttpUrl(resolved) && !isPlaceholderImage(resolved)) {
        return resolved;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function safeArticleUrl(
  raw: string | null | undefined,
  title: string,
  provider: NewsProviderId
): string | null {
  const cleaned = normalizeNewsEncoding(raw ?? "").trim();
  if (cleaned && isValidHttpUrl(cleaned)) {
    return canonicalArticleUrl(cleaned);
  }
  if (cleaned) {
    const withProto = cleaned.startsWith("//")
      ? `https:${cleaned}`
      : cleaned.includes("://")
        ? cleaned
        : `https://${cleaned}`;
    if (isValidHttpUrl(withProto)) return canonicalArticleUrl(withProto);
  }
  const hash = createHash("sha256")
    .update(`${provider}|${title}|${cleaned}`)
    .digest("hex")
    .slice(0, 16);
  return `https://wire.cgbhaskar.local/p/${provider}/${hash}`;
}

export function safeSlug(title: string, articleUrl: string): string {
  return buildArticleSlug(title, undefined, articleUrl);
}

function inferCategory(
  raw: string | null | undefined,
  title: string
): string {
  const cat = normalizeNewsEncoding(raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  if ((NEWS_INGEST_CATEGORIES as string[]).includes(cat)) return cat;
  if (cat === "general" || cat === "national" || cat === "nation" || cat === "india") {
    return "politics";
  }
  const t = title.toLowerCase();
  if (/sport|cricket|खेल/.test(t)) return "sports";
  if (/business|economy|व्यापार|बाजार/.test(t)) return "business";
  if (/tech|technology|टेक/.test(t)) return "technology";
  if (/health|स्वास्थ्य/.test(t)) return "health";
  if (/entertainment|bollywood|फिल्म/.test(t)) return "entertainment";
  if (/raipur|bastar|bilaspur|chhattisgarh|छत्तीसगढ|रायपुर/.test(t)) return "local";
  if (/politic|election|चुनाव|सरकार/.test(t)) return "politics";
  return "world";
}

function truncate(s: string | null, max: number): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Full article sanitize — trim, encoding, soft field repair */
export function sanitizeNewsArticle(
  article: NormalizedArticle
): { article: NormalizedArticle; warnings: string[]; softFixed: number } {
  const warnings: string[] = [];
  let softFixed = 0;

  const titleRaw = normalizeNewsEncoding(article.title);
  const title = truncate(titleRaw, MAX_TITLE) ?? "";

  const article_url = safeArticleUrl(article.article_url, title, article.provider);
  if (article_url && article_url !== article.article_url) {
    warnings.push("article_url_repaired");
    softFixed++;
  }

  let description =
    truncate(
      normalizeNewsEncoding(article.description ?? article.content ?? ""),
      MAX_DESCRIPTION
    ) ?? null;
  if (!description || description.length < 8) {
    description = truncate(title, MAX_DESCRIPTION);
    warnings.push("description_from_title");
    softFixed++;
  }

  let content = truncate(
    normalizeNewsEncoding(article.content ?? description ?? ""),
    MAX_CONTENT
  );
  if (!content) {
    content = description;
    softFixed++;
  }

  const image_url = safeImageUrl(article.image_url, article_url ?? undefined);
  if (!image_url && article.image_url) {
    warnings.push("image_url_stripped");
    softFixed++;
  }

  const published_at = safeParsePublishedAt(article.published_at);
  if (!article.published_at) {
    warnings.push("published_at_defaulted");
    softFixed++;
  }

  const category = inferCategory(article.category, title);
  if (category !== article.category) {
    warnings.push("category_inferred");
    softFixed++;
  }

  const source = truncate(normalizeNewsEncoding(article.source), 200);
  const author = truncate(normalizeNewsEncoding(article.author), 120);

  const sanitized: NormalizedArticle = {
    ...article,
    title,
    description,
    content,
    image_url,
    article_url: article_url!,
    published_at,
    category,
    source: source || article.provider || "wire",
    author: author || null,
    language: article.language ?? null,
    region: article.region ?? "india",
    slug: article.slug ?? safeSlug(title, article_url!),
  };

  return { article: sanitized, warnings, softFixed };
}

export function logArticleValidationFailed(
  provider: string,
  reason: string,
  article: NormalizedArticle | null,
  errors: string[] = []
): void {
  console.error("ARTICLE_VALIDATION_FAILED", {
    provider,
    reason,
    errors,
    title: article?.title?.slice(0, 120),
    articleUrl: article?.article_url,
    imageUrl: article?.image_url,
    publishedAt: article?.published_at,
  });
}

/**
 * Validate after sanitization — only reject truly unusable articles
 */
export function isValidNewsArticle(
  raw: NormalizedArticle,
  stats?: ArticleValidationStats
): ArticleValidationResult {
  if (stats) stats.total++;

  const { article, warnings, softFixed } = sanitizeNewsArticle(raw);
  if (stats) {
    stats.sanitized++;
    if (softFixed > 0) stats.softFixed += softFixed;
  }

  const fatalErrors: string[] = [];
  const title = article.title?.trim() ?? "";

  if (!title || title.length < MIN_TITLE_LEN) {
    fatalErrors.push("missing_title");
  }

  if (REMOVED_TITLES.has(title.toLowerCase()) || DEMO_TITLE_RE.test(title)) {
    fatalErrors.push("demo_or_removed_title");
  }

  if (!article.article_url || !isValidHttpUrl(article.article_url)) {
    fatalErrors.push("missing_article_url");
  }

  if (fatalErrors.length > 0) {
    const reason = fatalErrors[0];
    if (stats) {
      stats.rejected++;
      bumpReason(stats, reason);
    }
    logArticleValidationFailed(
      article.provider,
      reason,
      article,
      fatalErrors
    );
    return {
      valid: false,
      sanitizedArticle: null,
      warnings,
      fatalErrors,
    };
  }

  return {
    valid: true,
    sanitizedArticle: article,
    warnings,
    fatalErrors: [],
  };
}

export function validateArticlesForIngest(
  articles: NormalizedArticle[],
  provider: NewsProviderId
): {
  valid: NormalizedArticle[];
  stats: ArticleValidationStats;
  failures: Array<{ title: string; reason: string; provider: string }>;
} {
  const stats = emptyStats();
  const valid: NormalizedArticle[] = [];
  const failures: Array<{ title: string; reason: string; provider: string }> =
    [];

  for (const raw of articles) {
    const result = isValidNewsArticle({ ...raw, provider: raw.provider ?? provider }, stats);
    if (result.valid && result.sanitizedArticle) {
      valid.push(result.sanitizedArticle);
    } else {
      const reason = result.fatalErrors[0] ?? "invalid";
      failures.push({
        title: raw.title?.slice(0, 120) ?? "unknown",
        reason,
        provider,
      });
    }
  }

  return { valid, stats, failures };
}
