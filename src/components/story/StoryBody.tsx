import { StoryInlineImage } from "@/components/story/StoryInlineImage";
import type { StoryBlock, StorySection } from "@/lib/news/story-markdown";
import type { ReactNode } from "react";

type StoryBodyProps = {
  sections: StorySection[];
  plainParagraphs: string[];
  plainBlocks: StoryBlock[];
  /** Injected mid-article (after Nth paragraph block) */
  inlineSlot?: ReactNode;
  inlineAfterParagraph?: number;
};

function StoryQuoteBlock({
  text,
  attribution,
}: {
  text: string;
  attribution?: string;
}) {
  return (
    <blockquote className="story-quote">
      <p className="story-quote__text">{text}</p>
      {attribution ? (
        <cite className="story-quote__cite">— {attribution}</cite>
      ) : null}
    </blockquote>
  );
}

function StoryStatBlock({ value, label }: { value: string; label: string }) {
  return (
    <figure className="story-stat" aria-label={`Statistic: ${value}`}>
      <p className="story-stat__value">{value}</p>
      <figcaption className="story-stat__label">{label}</figcaption>
    </figure>
  );
}

function StoryBlocks({
  blocks,
  paragraphIndexRef,
  inlineSlot,
  inlineAfterParagraph,
}: {
  blocks: StoryBlock[];
  paragraphIndexRef: { current: number };
  inlineSlot?: ReactNode;
  inlineAfterParagraph: number;
}) {
  const nodes: ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.type === "paragraph") {
      paragraphIndexRef.current += 1;
      nodes.push(
        <p
          key={`p-${i}`}
          className="immersive-story__paragraph story-prose-p"
        >
          {block.text}
        </p>
      );
      if (
        inlineSlot &&
        paragraphIndexRef.current === inlineAfterParagraph
      ) {
        nodes.push(
          <div key="inline-slot" className="story-prose__inline-slot">
            {inlineSlot}
          </div>
        );
      }
      continue;
    }

    if (block.type === "quote") {
      nodes.push(
        <StoryQuoteBlock
          key={`q-${i}`}
          text={block.text}
          attribution={block.attribution}
        />
      );
      continue;
    }

    if (block.type === "stat") {
      nodes.push(
        <StoryStatBlock
          key={`s-${i}`}
          value={block.value}
          label={block.label}
        />
      );
      continue;
    }

    if (block.type === "list") {
      nodes.push(
        <ul key={`l-${i}`} className="story-prose-list">
          {block.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
      continue;
    }

    nodes.push(
      <StoryInlineImage key={`img-${i}`} src={block.src} alt={block.alt} />
    );
  }

  return <>{nodes}</>;
}

export function StoryBody({
  sections,
  plainParagraphs,
  plainBlocks,
  inlineSlot,
  inlineAfterParagraph = 3,
}: StoryBodyProps) {
  const paragraphIndexRef = { current: 0 };

  if (sections.length > 0) {
    return (
      <div className="immersive-story__prose story-prose">
        {sections.map((section, sectionIdx) => (
          <section
            key={section.id}
            id={section.id}
            className="immersive-story__section story-section"
          >
            <h2 className="immersive-story__section-title story-headline">
              {section.title}
            </h2>
            <StoryBlocks
              blocks={section.blocks}
              paragraphIndexRef={paragraphIndexRef}
              inlineSlot={
                sectionIdx === 0 ? inlineSlot : undefined
              }
              inlineAfterParagraph={inlineAfterParagraph}
            />
          </section>
        ))}
      </div>
    );
  }

  if (plainBlocks.length > 0) {
    return (
      <div className="immersive-story__prose story-prose">
        <StoryBlocks
          blocks={plainBlocks}
          paragraphIndexRef={paragraphIndexRef}
          inlineSlot={inlineSlot}
          inlineAfterParagraph={inlineAfterParagraph}
        />
      </div>
    );
  }

  return (
    <div className="immersive-story__prose story-prose">
      {plainParagraphs.map((para, i) => {
        paragraphIndexRef.current = i + 1;
        return (
          <div key={i}>
            <p className="immersive-story__paragraph story-prose-p">{para}</p>
            {inlineSlot && i + 1 === inlineAfterParagraph ? (
              <div className="story-prose__inline-slot">{inlineSlot}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
