import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const STOP_WORDS = new Set([
  "about", "after", "again", "amid", "from", "into", "news", "today", "with",
  "और", "आज", "लिए", "में", "का", "की", "के", "से", "पर", "एक", "बाद",
]);

const CURATED_IMAGE_TOPICS: Record<string, RegExp> = {
  "assembly-politics.jpg": /\b(assembly|election|minister|government|politics|cabinet)\b|विधानसभा|चुनाव|सरकार|मंत्री/i,
  "cricket-ground.jpg": /\b(cricket|sport|match|tournament|ipl)\b|क्रिकेट|खेल|मैच/i,
  "folk-culture.jpg": /\b(culture|festival|entertainment|film|dance|tribal)\b|संस्कृति|त्योहार|मनोरंजन|फिल्म|नृत्य/i,
  "raipur-city.jpg": /\b(raipur|city|traffic|road|urban|municipal)\b|रायपुर|शहर|यातायात|सड़क|नगर/i,
  "rural-health.jpg": /\b(health|hospital|medical|doctor|clinic|disease)\b|स्वास्थ्य|अस्पताल|चिकित्सा|डॉक्टर/i,
  "school-india.jpg": /\b(school|college|student|education|exam|teacher)\b|स्कूल|कॉलेज|छात्र|शिक्षा|परीक्षा|शिक्षक/i,
  "steel-industry.jpg": /\b(steel|industry|factory|plant|manufacturing|business|power|market|trade)\b|इस्पात|उद्योग|कारखाना|व्यापार|बिजली|बाजार/i,
  "water-civic.jpg": /\b(water|rain|monsoon|river|weather|flood|traffic|road|drainage)\b|पानी|बारिश|मानसून|नदी|मौसम|बाढ़|यातायात|सड़क|नाली/i,
};

/**
 * Historical rows can contain a valid local fallback that belongs to a different
 * subject. Keep the database intact, but reject that mismatch at render time.
 */
export function isCuratedEditorialImageRelevant(
  imageUrl: string,
  input: {
    category?: string | null;
    headline?: string | null;
    region?: string | null;
    tags?: string[];
  }
): boolean {
  let pathname = imageUrl;
  try {
    pathname = new URL(imageUrl, "https://www.jandarpan.news").pathname;
  } catch {
    // A malformed URL is handled by the normal displayability validator.
  }
  if (!pathname.toLowerCase().startsWith("/editorial/")) return true;

  const filename = pathname.split("/").pop()?.toLowerCase() ?? "";
  const topic = CURATED_IMAGE_TOPICS[filename];
  if (!topic) return true;

  const storyText = [
    input.headline ?? "",
    input.category ?? "",
    input.region ?? "",
    ...(input.tags ?? []),
  ].join(" ");
  return topic.test(storyText);
}

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
