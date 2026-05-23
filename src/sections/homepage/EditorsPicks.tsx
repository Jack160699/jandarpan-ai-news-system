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
      id="editorial"
      className="nr-section nr-section--editorial scroll-mt-24"
      aria-labelledby="nr-editors-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-editors-title"
          kicker="Lead story"
          title="Editor’s picks"
          titleHi="संपादक की पसंद"
          description="Original AI-edited coverage — synthesized from verified regional and national sources."
        />

        <div className="nr-hero-premium">
          <StoryCard article={lead} variant="editorial-lead" priority />
        </div>

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
