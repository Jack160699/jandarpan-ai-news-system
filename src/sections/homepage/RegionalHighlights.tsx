import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { HomeArticle } from "@/lib/homepage/types";

type RegionalHighlightsProps = {
  articles: HomeArticle[];
};

export function RegionalHighlights({ articles }: RegionalHighlightsProps) {
  if (!articles.length) return null;

  const [lead, ...rest] = articles;

  return (
    <section
      id="regional"
      className="nr-section nr-section--regional scroll-mt-24"
      aria-labelledby="nr-regional-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-regional-title"
          kicker="भारत · India"
          title="National highlights"
          titleHi="देश की बड़ी खबरें"
          description="Stories that matter across India — politics, economy, policy, and national developments."
        />

        <div className="nr-regional-mosaic">
          <div className="nr-regional-mosaic__lead">
            <StoryCard article={lead} variant="editorial-lead" priority />
          </div>

          {rest.length > 0 ? (
            <ul className="nr-regional-mosaic__stack" role="list">
              {rest.map((article) => (
                <li key={article.id}>
                  <StoryCard article={article} variant="compact" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
