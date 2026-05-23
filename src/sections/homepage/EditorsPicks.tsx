import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { EditorsPicksBlock } from "@/lib/homepage/types";

type EditorsPicksProps = {
  picks: EditorsPicksBlock;
};

export function EditorsPicks({ picks }: EditorsPicksProps) {
  const { lead, supporting } = picks;

  return (
    <section
      className="nr-section nr-section--editorial"
      aria-labelledby="nr-editors-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-editors-title"
          kicker="AI newsroom"
          title="Editor’s picks"
          titleHi="संपादक की पसंद"
          description="Original stories written and verified by our AI editorial desk — not raw wire copy."
        />

        <StoryCard article={lead} variant="editorial-lead" priority />

        {supporting.length > 0 ? (
          <ul className="nr-editors__grid" role="list">
            {supporting.map((article) => (
              <li key={article.id}>
                <StoryCard article={article} variant="editorial" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
