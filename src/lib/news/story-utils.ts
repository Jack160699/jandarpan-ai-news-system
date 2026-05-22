/**
 * Story page utilities — read time, body parsing, AI blocks
 */

import type { NewsArticleRow } from "@/lib/types/news-article";

export function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

export function storyBodyParagraphs(article: NewsArticleRow): string[] {
  const raw =
    article.content?.trim() ||
    article.description?.trim() ||
    "";

  if (!raw) {
    return [
      "This story is filed from our live regional wire. Read the full report at the original publisher using the source link above.",
    ];
  }

  const paras = raw
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  if (paras.length) return paras;

  return [raw.slice(0, 1200)];
}

export function whyThisMatters(article: NewsArticleRow): string {
  if (article.ai_summary && article.ai_summary.length > 80) {
    return article.ai_summary;
  }

  const region =
    article.region === "chhattisgarh"
      ? "Chhattisgarh"
      : article.region === "india"
        ? "India"
        : "the region";

  return `This ${article.category} development affects readers in ${region} — tracked on our live desk with regional context and source verification.`;
}

export function bilingualMiniSummary(article: NewsArticleRow): {
  en: string;
  hi: string;
} {
  const base =
    article.description?.trim() ||
    article.ai_summary?.trim() ||
    article.title;

  return {
    en: base.slice(0, 220),
    hi:
      article.language === "hi"
        ? base.slice(0, 220)
        : `छत्तीसगढ़ और मध्य भारत के पाठकों के लिए महत्वपूर्ण ${article.category} अपडेट।`,
  };
}
