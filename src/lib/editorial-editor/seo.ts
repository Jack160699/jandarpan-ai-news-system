export function readingEaseScore(text: string): number {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  const words = clean.split(" ").length;
  const sentences = Math.max(1, clean.split(/[.!?।]/).filter(Boolean).length);
  const syllablesApprox = clean.replace(/[^aeiouअआइईउऊएऐओऔऋ]/gi, "").length;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllablesApprox / words);
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function computeSeoScore(input: {
  headline: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  body: string;
  tags: string[];
  focusKeyword?: string;
}): number {
  let score = 0;
  if (input.headline.length >= 25 && input.headline.length <= 90) score += 20;
  if (input.slug.length >= 8 && input.slug.length <= 90) score += 15;
  if (input.seoTitle.length >= 40 && input.seoTitle.length <= 70) score += 20;
  if (input.seoDescription.length >= 110 && input.seoDescription.length <= 170) score += 20;
  if (input.body.length >= 1200) score += 15;
  if (input.tags.length >= 2) score += 5;
  if (input.focusKeyword && input.headline.toLowerCase().includes(input.focusKeyword.toLowerCase())) {
    score += 5;
  }
  return Math.min(100, score);
}

export function suggestKeywords(input: {
  headline: string;
  summary: string;
  body: string;
  tags: string[];
}): string[] {
  const text = `${input.headline} ${input.summary} ${input.body}`.toLowerCase();
  const stop = new Set([
    "the", "and", "for", "with", "from", "that", "this", "are", "was", "has",
    "की", "के", "में", "से", "को", "पर", "एक", "है", "था",
  ]);
  const words = text.match(/[\u0900-\u097Fa-z]{4,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
  return [...new Set([...input.tags.map((t) => t.toLowerCase()), ...ranked])].slice(0, 10);
}

export function slugifyHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-\u0900-\u097F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96);
}
