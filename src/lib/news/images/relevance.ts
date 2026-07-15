import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const STOP_WORDS = new Set([
  "about", "after", "again", "amid", "from", "into", "news", "today", "with",
  "और", "आज", "लिए", "में", "का", "की", "के", "से", "पर", "एक", "बाद",
]);

function canonicalImageKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) return trimmed.toLowerCase().split("?")[0];
  try {
    const url = new URL(trimmed);
    return `${url.origin}${url.pathname}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

function articleTokens(row: GeneratedArticleRow): Set<string> {
  const text = [row.headline, row.summary ?? "", ...(row.tags ?? [])]
    .join(" ")
    .toLocaleLowerCase();
  return new Set(
    text
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
  );
}

function relatedStories(a: GeneratedArticleRow, b: GeneratedArticleRow): boolean {
  if (a.event_id && b.event_id && a.event_id === b.event_id) return true;
  const clusterA = a.editorial_metadata?.duplicate_cluster_id;
  const clusterB = b.editorial_metadata?.duplicate_cluster_id;
  if (clusterA && clusterB && clusterA === clusterB) return true;
  const tokensA = articleTokens(a);
  const tokensB = articleTokens(b);
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap++;
    if (overlap >= 2) return true;
  }
  return false;
}

function clearDuplicateImage(row: GeneratedArticleRow): GeneratedArticleRow {
  const image = row.editorial_metadata?.image;
  return {
    ...row,
    hero_image_url: null,
    editorial_metadata: {
      ...row.editorial_metadata,
      image: image
        ? {
            ...image,
            hero_url: undefined,
            og_url: undefined,
            fallback_tier: "duplicate_unrelated_rejected",
          }
        : image,
    },
  };
}

export type ImageReuseSafeguardResult = {
  rows: GeneratedArticleRow[];
  rejectedArticleIds: string[];
};

/** Reject the same assigned image when stories have no shared event or topic. */
export function safeguardUnrelatedImageReuse(
  rows: GeneratedArticleRow[]
): ImageReuseSafeguardResult {
  const firstByImage = new Map<string, GeneratedArticleRow>();
  const rejectedArticleIds: string[] = [];
  const safeRows = rows.map((row) => {
    const imageUrl = row.hero_image_url ?? row.editorial_metadata?.image?.hero_url ?? null;
    if (!imageUrl?.trim()) return row;
    const key = canonicalImageKey(imageUrl);
    const first = firstByImage.get(key);
    if (!first) {
      firstByImage.set(key, row);
      return row;
    }
    if (first.id === row.id || relatedStories(first, row)) return row;
    rejectedArticleIds.push(row.id);
    return clearDuplicateImage(row);
  });
  return { rows: safeRows, rejectedArticleIds };
}
