"use client";

import { LocalizedSectionHeader } from "@/components/homepage/LocalizedSectionHeader";
import { StoryCard } from "@/components/homepage/StoryCard";
import { MotionFeed, Reveal } from "@/components/motion";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type TrendingStoriesProps = {
  articles: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function TrendingStories({ articles, freshIds }: TrendingStoriesProps) {
  const { t } = useLanguage();
  if (!articles.length) return null;

  const [top, ...rest] = articles;

  return (
    <Reveal as="section" id="trending" className="nr-section nr-section--trending scroll-mt-24" aria-labelledby="nr-trending-title">
      <div className="nr-wrap">
        <LocalizedSectionHeader
          id="nr-trending-title"
          title={t.home.trending}
        />

        <div className="hp-trending-layout">
          <div className="hp-trending-layout__lead nr-trending-featured">
            <StoryCard
              article={top}
              variant="editorial"
              priority
              rank={1}
              showFreshBadge={freshIds?.has(top.id)}
            />
          </div>

          {rest.length > 0 ? (
            <MotionFeed as="ul" className="nr-trending-list" role="list">
              {rest.map((article, index) => (
                <li key={article.id}>
                  <StoryCard
                    article={article}
                    variant="trending"
                    rank={index + 2}
                  />
                </li>
              ))}
            </MotionFeed>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}
