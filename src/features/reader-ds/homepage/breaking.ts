import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

export type BreakingItem = {
  slug: string;
  headline: string;
  href: string;
};

function normalizeHeadline(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Highest-ranked breaking item first. Dedupes by slug + normalized headline.
 * Ranking source stays upstream (breakingTicker / localBreakingAlerts).
 */
export function pickBreakingItems(feed: GeneratedHomepageFeed, limit = 5): BreakingItem[] {
  const out: BreakingItem[] = [];
  const seenSlug = new Set<string>();
  const seenHeadline = new Set<string>();

  const push = (slug: string | null | undefined, headline: string | null | undefined) => {
    const h = headline?.trim();
    if (!h) return;
    const s = slug?.trim() ?? "";
    const keyH = normalizeHeadline(h);
    if (s && seenSlug.has(s)) return;
    if (seenHeadline.has(keyH)) return;
    if (s) seenSlug.add(s);
    seenHeadline.add(keyH);
    out.push({
      slug: s || keyH,
      headline: h,
      href: s ? `/story/${s}` : "#",
    });
  };

  for (const a of feed.breakingTicker ?? []) {
    push(a.slug, a.headline);
    if (out.length >= limit) return out;
  }

  for (const a of feed.localBreakingAlerts ?? []) {
    push(a.slug, a.headline);
    if (out.length >= limit) return out;
  }

  return out;
}

/** Story href for a HomeArticle — used by homepage section builders. */
export function storyHref(a: Pick<HomeArticle, "slug">): string {
  return `/story/${a.slug}`;
}
