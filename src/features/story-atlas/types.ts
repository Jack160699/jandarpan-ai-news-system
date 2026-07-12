import type { SponsoredStoryMeta } from "@/lib/monetization/types";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";
import type { EditorialMetadata, GeneratedArticleRow } from "@/lib/types/newsroom";
import type { NewsArticleRow } from "@/lib/types/news-article";
import type { StoryBlock, StorySection } from "@/lib/news/story-markdown";

export type AtlasStoryExperienceProps = {
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
