/**
 * Article ↔ district matching for homepage HomeArticle pools.
 * Exact alias match only — no hash bucketing into unrelated districts.
 */

import { CG_DISTRICTS, getDistrict } from "@/lib/regional/districts";
import type { HomeArticle } from "@/lib/homepage/types";
import { getNearbyDistricts } from "./geo";

function articleSearchBlob(article: HomeArticle): string {
  return [
    article.headline,
    article.summary,
    article.categoryLabel,
    article.section,
    article.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

/** Resolve primary district slug from article text/tags; null if unknown */
export function resolveArticleDistrictSlug(
  article: HomeArticle
): string | null {
  const text = articleSearchBlob(article);

  // Prefer longer aliases first to avoid partial collisions
  const scored: Array<{ slug: string; aliasLen: number }> = [];
  for (const d of CG_DISTRICTS) {
    for (const alias of d.aliases) {
      const a = alias.toLowerCase();
      if (a === "capital") continue; // weak — never assign alone
      if (text.includes(a)) {
        scored.push({ slug: d.slug, aliasLen: a.length });
      }
    }
    if (text.includes(d.name.toLowerCase()) || text.includes(d.nameHi)) {
      scored.push({ slug: d.slug, aliasLen: d.name.length });
    }
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.aliasLen - a.aliasLen);
  return scored[0].slug;
}

export function articleMatchesDistrict(
  article: HomeArticle,
  districtSlug: string
): boolean {
  const resolved = getDistrict(districtSlug)?.slug;
  if (!resolved) return false;
  const articleSlug = resolveArticleDistrictSlug(article);
  if (articleSlug === resolved) return true;

  // Tag exact slug / alias hits
  const aliases = new Set(
    (getDistrict(resolved)?.aliases ?? []).map((a) => a.toLowerCase())
  );
  aliases.add(resolved);
  return article.tags.some((t) => aliases.has(t.toLowerCase()));
}

export function articleMatchesNearby(
  article: HomeArticle,
  selectedSlug: string
): boolean {
  const articleSlug = resolveArticleDistrictSlug(article);
  if (!articleSlug || articleSlug === selectedSlug) return false;
  return getNearbyDistricts(selectedSlug).some((n) => n.slug === articleSlug);
}

export function isStatewideHomeArticle(article: HomeArticle): boolean {
  if (article.section === "chhattisgarh") return true;
  const blob = articleSearchBlob(article);
  return (
    /\b(chhattisgarh|छत्तीसगढ़|छत्तीसगढ|vidhan sabha|विधान सभा|chief minister|मुख्यमंत्री|state government|राज्य सरकार)\b/i.test(
      blob
    ) && !resolveArticleDistrictSlug(article)
  );
}
