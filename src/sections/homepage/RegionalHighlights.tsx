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
      className="nr-section"
      aria-labelledby="nr-regional-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-regional-title"
          kicker="छत्तीसगढ़ · CG"
          title="Regional highlights"
          titleHi="क्षेत्रीय खबरें"
          description="Stories that matter closest to home — Raipur, Bastar, and across the state."
        />

        <StoryCard article={lead} variant="editorial-lead" />

        {rest.length > 0 ? (
          <ul className="nr-regional__list" role="list">
            {rest.map((article) => (
              <li key={article.id}>
                <StoryCard article={article} variant="compact" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
