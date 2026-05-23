import Link from "next/link";
import { StoryCard } from "@/components/homepage/StoryCard";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { categoryPath } from "@/lib/seo/categories";
import type { RegionalSectionBlock } from "@/lib/homepage/types";

type CategoryStreamsProps = {
  streams: RegionalSectionBlock[];
};

export function CategoryStreams({ streams }: CategoryStreamsProps) {
  if (!streams.length) return null;

  return (
    <section
      className="nr-section nr-section--categories"
      aria-labelledby="nr-categories-title"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="nr-categories-title"
          kicker="Browse by desk"
          title="Category streams"
          titleHi="श्रेणी"
        />
      </div>

      <div className="nr-categories">
        {streams.map((stream) => (
          <div key={stream.id} className="nr-categories__block">
            <div className="nr-categories__head">
              <h3 className="nr-categories__label">
                <Link href={categoryPath(stream.id)} className="nr-categories__hub-link">
                  {stream.label}
                </Link>
              </h3>
              <span className="nr-categories__label-hi">{stream.labelHi}</span>
            </div>
            <ul className="nr-categories__cards" role="list">
              {stream.articles.map((article) => (
                <li key={article.id}>
                  <StoryCard article={article} variant="editorial" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
