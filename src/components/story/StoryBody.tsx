import type { StorySection } from "@/lib/news/story-markdown";

type StoryBodyProps = {
  sections: StorySection[];
  plainParagraphs: string[];
};

export function StoryBody({ sections, plainParagraphs }: StoryBodyProps) {
  if (sections.length > 0) {
    return (
      <div className="immersive-story__prose">
        {sections.map((section) => (
          <section key={section.id} className="immersive-story__section">
            <h2 className="immersive-story__section-title">{section.title}</h2>
            {section.paragraphs.map((para, i) => (
              <p key={i} className="immersive-story__paragraph">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="immersive-story__prose">
      {plainParagraphs.map((para, i) => (
        <p key={i} className="immersive-story__paragraph">
          {para}
        </p>
      ))}
    </div>
  );
}
