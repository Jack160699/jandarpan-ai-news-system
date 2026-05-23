import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveWireProps = {
  items: HomeArticle[];
};

export function LiveWire({ items }: LiveWireProps) {
  if (!items.length) return null;

  return (
    <section
      className="nr-section nr-section--wire"
      aria-labelledby="nr-wire-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-wire-title"
          kicker="Live desk"
          title="Live wire"
          titleHi="लाइव वायर"
          description="Fast headlines from the newsroom wire — lightweight updates as stories develop."
        />
      </div>

      <ol className="nr-wire__list" role="list">
        {items.map((item) => (
          <li key={item.id} className="nr-wire__item">
            <StoryCard article={item} variant="wire" />
          </li>
        ))}
      </ol>
    </section>
  );
}
