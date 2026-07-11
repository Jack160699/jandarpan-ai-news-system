import { StoryBody } from "@/components/story/StoryBody";
import type { StoryBlock, StorySection } from "@/lib/news/story-markdown";

type ArticleBodyProps = {
  sections: StorySection[];
  plainParagraphs: string[];
  plainBlocks: StoryBlock[];
};

/**
 * Article body with V3 typography wrapper.
 */
export function ArticleBody({
  sections,
  plainParagraphs,
  plainBlocks,
}: ArticleBodyProps) {
  return (
    <div className="article-v3-body">
      <StoryBody
        sections={sections}
        plainParagraphs={plainParagraphs}
        plainBlocks={plainBlocks}
      />
    </div>
  );
}
