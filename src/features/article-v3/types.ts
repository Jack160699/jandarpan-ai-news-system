import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";
import type { StorySection, StoryBlock } from "@/lib/news/story-markdown";

export type ArticleExperienceV3Props = {
  article: NewsArticleRow;
  related: NewsArticleRow[];
  relatedDiscoverySubtitle?: string | null;
  intelligence: StoryIntelligenceVm;
  editorialMeta?: EditorialMetadata | null;
  generatedRow?: GeneratedArticleRow | null;
  sponsoredStory?: SponsoredStoryMeta | null;
  contentSections: StorySection[];
  plainParagraphs: string[];
  plainBlocks: StoryBlock[];
  canonicalUrl: string;
  slug: string;
  headline: string;
  shareSummary: string;
  translationActive?: boolean;
};

export type ArticleV3HeroProps = {
  headline: string;
  categoryLabel: string;
  regionLabel: string | null;
  readTime: string;
  publishedAtLabel: string | null;
  isLive: boolean;
  desk: string | null;
  imageSrc: string;
  imageFallbackSrc: string;
  imageSizes: string;
  imageCredit?: string | null;
};

export type ArticleV3ToolbarProps = {
  slug: string;
  title: string;
  url: string;
  readTime: string;
};
