import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import type { NewsArticleRow } from "@/lib/types/news-article";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";

/** Design screens B11–B20 (opinion/editorial split from B17). */
export type ArticleVariant =
  | "standard"
  | "breaking"
  | "live-blog"
  | "photo"
  | "video"
  | "explainer"
  | "opinion"
  | "editorial"
  | "sponsored"
  | "premium"
  | "no-image";

export const ARTICLE_VARIANTS: ArticleVariant[] = [
  "standard",
  "breaking",
  "live-blog",
  "photo",
  "video",
  "explainer",
  "opinion",
  "editorial",
  "sponsored",
  "premium",
  "no-image",
];

export function isArticleVariant(value: string | undefined | null): value is ArticleVariant {
  return Boolean(value && (ARTICLE_VARIANTS as string[]).includes(value));
}

export type ReaderArticleModel = {
  variant: ArticleVariant;
  slug: string;
  canonicalUrl: string;
  headline: string;
  kicker: string;
  summary: string | null;
  paragraphs: string[];
  imageUrl: string | null;
  imageCaption: string | null;
  author: string;
  role: string;
  publishedLabel: string | null;
  updatedLabel: string | null;
  readTime: string | null;
  categoryLabel: string;
  tags: string[];
  takeaways: string[];
  isBreaking: boolean;
  isLive: boolean;
  liveHref: string | null;
  sponsored: SponsoredStoryMeta | null;
  related: Array<{
    slug: string;
    headline: string;
    kicker?: string;
    imageUrl?: string | null;
    publishedAt?: string | null;
  }>;
  /** Optional stats for explainer data box — only from real takeaways/meta, never invented. */
  stats: Array<{ value: string; label: string }>;
  article: NewsArticleRow;
  intelligence?: StoryIntelligenceVm | null;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
};
