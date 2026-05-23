import { StoryInlineImage } from "@/components/story/StoryInlineImage";
import type { StoryBlock, StorySection } from "@/lib/news/story-markdown";

type StoryBodyProps = {
  sections: StorySection[];
  plainParagraphs: string[];
  plainBlocks: StoryBlock[];
};

function StoryBlocks({ blocks }: { blocks: StoryBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="immersive-story__paragraph story-prose-p">
              {block.text}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="story-prose-list">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <StoryInlineImage key={i} src={block.src} alt={block.alt} />
        );
      })}
    </>
  );
}

export function StoryBody({
  sections,
  plainParagraphs,
  plainBlocks,
}: StoryBodyProps) {
  if (sections.length > 0) {
    return (
      <div className="immersive-story__prose story-prose">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="immersive-story__section story-section"
          >
            <h2 className="immersive-story__section-title story-headline">
              {section.title}
            </h2>
            <StoryBlocks blocks={section.blocks} />
          </section>
        ))}
      </div>
    );
  }

  if (plainBlocks.length > 0) {
    return (
      <div className="immersive-story__prose story-prose">
        <StoryBlocks blocks={plainBlocks} />
      </div>
    );
  }

  return (
    <div className="immersive-story__prose story-prose">
      {plainParagraphs.map((para, i) => (
        <p key={i} className="immersive-story__paragraph story-prose-p">
          {para}
        </p>
      ))}
    </div>
  );
}
