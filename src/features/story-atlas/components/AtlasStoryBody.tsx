import { memo, type ReactNode } from "react";
import type { StoryBlock, StorySection } from "@/lib/news/story-markdown";
import { AtlasQuote } from "./AtlasQuote";
import { AtlasFactBox } from "./AtlasFactBox";
import { AtlasStoryImage } from "./AtlasStoryImage";

type AtlasStoryBodyProps = {
  sections: StorySection[];
  plainParagraphs: string[];
  plainBlocks: StoryBlock[];
};

function renderBlocks(blocks: StoryBlock[]): ReactNode[] {
  return blocks.map((block, i) => {
    if (block.type === "paragraph") {
      return (
        <p key={`p-${i}`} className="atlas-story-body__p">
          {block.text}
        </p>
      );
    }
    if (block.type === "quote") {
      return (
        <AtlasQuote
          key={`q-${i}`}
          text={block.text}
          attribution={block.attribution}
        />
      );
    }
    if (block.type === "stat") {
      return (
        <AtlasFactBox key={`s-${i}`} title={block.label} variant="numbers">
          <p className="atlas-fact-box__number">{block.value}</p>
        </AtlasFactBox>
      );
    }
    if (block.type === "list") {
      return (
        <AtlasFactBox key={`l-${i}`} title="Key points" variant="facts">
          <ul className="atlas-fact-box__list">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </AtlasFactBox>
      );
    }
    return (
      <AtlasStoryImage key={`img-${i}`} src={block.src} alt={block.alt} />
    );
  });
}

export const AtlasStoryBody = memo(function AtlasStoryBody({
  sections,
  plainParagraphs,
  plainBlocks,
}: AtlasStoryBodyProps) {
  if (sections.length > 0) {
    return (
      <div className="atlas-story-body">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="atlas-story-body__section">
            <h2 className="atlas-story-body__section-title">{section.title}</h2>
            {renderBlocks(section.blocks)}
          </section>
        ))}
      </div>
    );
  }

  if (plainBlocks.length > 0) {
    return <div className="atlas-story-body">{renderBlocks(plainBlocks)}</div>;
  }

  return (
    <div className="atlas-story-body">
      {plainParagraphs.map((para, i) => (
        <p key={i} className="atlas-story-body__p">
          {para}
        </p>
      ))}
    </div>
  );
});
