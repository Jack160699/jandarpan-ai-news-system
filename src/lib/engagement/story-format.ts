/**
 * Story card format variants for homepage density without visual chaos.
 * Inference is conservative — only label when signals are clear.
 */

import type { HomeArticle } from "@/lib/homepage/types";
import type { ReaderStory } from "@/features/reader-ds/utils";

export type StoryCardFormat =
  | "standard"
  | "breaking"
  | "live"
  | "developing"
  | "explainer"
  | "three_things"
  | "photo"
  | "ground_report"
  | "fact_check"
  | "public_issue"
  | "timeline"
  | "quick_brief"
  | "longform";

const EXPLAINER_RE = /(समझिए|explainer|क्या है|why it matters|3 बातें|तीन बातें)/i;
const FACT_RE = /(fact\s*check|फैक्ट\s*चेक|सत्यापन|झूठ|अफवाह)/i;
const GROUND_RE = /(ground\s*report|ज़मीनी|जमीनी रिपोर्ट|फील्ड)/i;
const CIVIC_RE = /(जन समस्या|civic|नगर निगम|सड़क|drainage|पानी|बिजली कटौती)/i;
const TIMELINE_RE = /(timeline|टाइमलाइन|क्रोनोलॉजी|घटनाक्रम)/i;
const BRIEF_RE = /(60\s*सेकंड|quick\s*brief|संक्षेप|brief)/i;
const PHOTO_RE = /(photo\s*story|चित्र कथा|फ़ोटो स्टोरी|photo essay)/i;
const THREE_RE = /(3 बातें|तीन बातें|three\s*things|जानिए)/i;

export function classifyStoryFormat(
  article: Pick<
    HomeArticle,
    "headline" | "summary" | "isLive" | "urgency" | "ranking" | "tags" | "categoryLabel"
  > & { eventUpdateCount?: number }
): StoryCardFormat {
  if (article.isLive) return "live";
  if (article.ranking?.isBreaking || article.urgency === "high") return "breaking";
  if ((article.eventUpdateCount ?? 0) >= 2) return "developing";

  const blob = `${article.headline} ${article.summary ?? ""} ${(article.tags ?? []).join(" ")} ${article.categoryLabel ?? ""}`;
  if (FACT_RE.test(blob)) return "fact_check";
  if (THREE_RE.test(blob)) return "three_things";
  if (EXPLAINER_RE.test(blob)) return "explainer";
  if (GROUND_RE.test(blob)) return "ground_report";
  if (CIVIC_RE.test(blob)) return "public_issue";
  if (TIMELINE_RE.test(blob)) return "timeline";
  if (BRIEF_RE.test(blob)) return "quick_brief";
  if (PHOTO_RE.test(blob)) return "photo";

  const summaryLen = article.summary?.trim().length ?? 0;
  if (summaryLen > 420) return "longform";
  return "standard";
}

export const FORMAT_LABEL_HI: Record<StoryCardFormat, string | null> = {
  standard: null,
  breaking: "ब्रेकिंग",
  live: "लाइव",
  developing: "डेवलपिंग",
  explainer: "समझिए",
  three_things: "3 बातें जानिए",
  photo: "फ़ोटो स्टोरी",
  ground_report: "ज़मीनी रिपोर्ट",
  fact_check: "फैक्ट चेक",
  public_issue: "जन समस्या",
  timeline: "टाइमलाइन",
  quick_brief: "क्विक ब्रीफ",
  longform: "विस्तार",
};

export const FORMAT_LABEL_EN: Record<StoryCardFormat, string | null> = {
  standard: null,
  breaking: "Breaking",
  live: "Live",
  developing: "Developing",
  explainer: "Explainer",
  three_things: "3 things",
  photo: "Photo story",
  ground_report: "Ground report",
  fact_check: "Fact check",
  public_issue: "Public issue",
  timeline: "Timeline",
  quick_brief: "Quick brief",
  longform: "Longform",
};

export type FormattedReaderStory = ReaderStory & {
  format: StoryCardFormat;
  formatLabel?: string | null;
};

export function toFormattedStory(
  article: HomeArticle,
  locale: "hi" | "en" = "hi"
): FormattedReaderStory {
  const format = classifyStoryFormat(article);
  const label =
    locale === "en" ? FORMAT_LABEL_EN[format] : FORMAT_LABEL_HI[format];
  return {
    slug: article.slug,
    headline: article.headline,
    kicker: article.categoryLabel || article.desk?.nameHi || article.desk?.name,
    summary: article.summary,
    imageUrl: article.imageUrl,
    publishedAt: article.publishedAt,
    isLive: article.isLive,
    format,
    formatLabel: label,
  };
}
