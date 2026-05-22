/**
 * Stable, SEO-safe article slugs — Hindi + Latin, dedupe, hash fallback
 */

import { createHash } from "crypto";

const MAX_SLUG_LEN = 96;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

const TRANSLIT_MAP: Record<string, string> = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ee",
  उ: "u",
  ऊ: "oo",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  " ": "-",
};

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

function transliterateDevanagari(text: string): string {
  let out = "";
  for (const ch of text) {
    if (TRANSLIT_MAP[ch]) out += TRANSLIT_MAP[ch];
    else if (/[a-z0-9]/i.test(ch)) out += ch.toLowerCase();
    else if (/\s/.test(ch)) out += "-";
  }
  return out;
}

/** Latin-safe slug segment from title */
export function slugifyTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "story";

  let base = trimmed;
  if (DEVANAGARI_RE.test(trimmed)) {
    base = transliterateDevanagari(trimmed);
  }

  base = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!base || base.length < 4) {
    return `cg-news-${shortHash(trimmed)}`;
  }

  return base.slice(0, 72);
}

/**
 * Build unique slug: `{title-slug}-{id-prefix}` or hash fallback
 */
export function buildArticleSlug(
  title: string,
  articleId?: string,
  articleUrl?: string
): string {
  const base = slugifyTitle(title);
  const suffix = articleId
    ? articleId.replace(/-/g, "").slice(0, 8)
    : shortHash(`${title}|${articleUrl ?? ""}`);

  const slug = `${base}-${suffix}`.replace(/-+/g, "-").slice(0, MAX_SLUG_LEN);
  return slug || `cg-story-${suffix}`;
}

export function ensureUniqueSlug(
  slug: string,
  used: Set<string>
): string {
  const key = slug.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return slug;
  }

  let n = 2;
  while (used.has(`${key}-${n}`)) n++;
  const unique = `${slug}-${n}`.slice(0, MAX_SLUG_LEN);
  used.add(unique.toLowerCase());
  return unique;
}

export function assignSlugsToRows<
  T extends { title: string; article_url: string; id?: string },
>(rows: T[], existingSlugs: Set<string> = new Set()): Array<T & { slug: string }> {
  const used = new Set(existingSlugs);

  return rows.map((row) => {
    const raw = buildArticleSlug(row.title, row.id, row.article_url);
    const slug = ensureUniqueSlug(raw, used);
    return { ...row, slug };
  });
}

export function storyPath(slug: string): string {
  return `/story/${slug}`;
}
