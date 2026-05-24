import Link from "next/link";
import { StoryCard } from "@/components/homepage/StoryCard";
import { FeedListWithNativeAds } from "@/components/monetization/FeedListWithNativeAds";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { categoryPath } from "@/lib/seo/categories";
import type { RegionalSectionBlock } from "@/lib/homepage/types";

type CategoryStreamsProps = {
  streams: RegionalSectionBlock[];
};

const SECTION_ACCENTS = [
  "nr-categories__block--cg",
  "nr-categories__block--india",
  "nr-categories__block--world",
  "nr-categories__block--biz",
  "nr-categories__block--sports",
  "nr-categories__block--edu",
] as const;

export function CategoryStreams({ streams }: CategoryStreamsProps) {
  if (!streams.length) return null;

  return (
    <section
      id="categories"
      className="nr-section nr-section--categories scroll-mt-24"
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

      <div className="nr-categories nr-categories--staggered">
        {streams.map((stream, index) => {
          const accent =
            SECTION_ACCENTS[index % SECTION_ACCENTS.length] ??
            "nr-categories__block--cg";
          const layoutEven = index % 2 === 0;

          return (
            <div
              key={stream.id}
              className={`nr-categories__block ${accent}${layoutEven ? "" : " nr-categories__block--alt"}`}
            >
              <div className="nr-categories__head">
                <h3 className="nr-categories__label">
                  <Link
                    href={categoryPath(stream.id)}
                    className="nr-categories__hub-link"
                  >
                    {stream.label}
                  </Link>
                </h3>
                <span className="nr-categories__label-hi">
                  {stream.labelHi}
                </span>
              </div>
              <ul
                className={
                  layoutEven
                    ? "nr-categories__cards nr-categories__cards--stack"
                    : "nr-categories__cards nr-categories__cards--rail"
                }
                role="list"
              >
                <FeedListWithNativeAds
                  items={stream.articles}
                  feedId={`category-${stream.id}`}
                  getKey={(article) => article.id}
                  renderItem={(article) => (
                    <StoryCard
                      article={article}
                      variant={layoutEven ? "editorial" : "compact"}
                    />
                  )}
                />
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
