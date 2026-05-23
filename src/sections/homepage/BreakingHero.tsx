"use client";

import { useRef } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { BreakingHeroReel } from "@/sections/homepage/BreakingHeroReel";
import { IMG_HERO_LEAD, IMG_HERO_THUMB } from "@/lib/images/homepage-sizes";
import { formatHomeTime } from "@/lib/homepage/format";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsShortCard as ShortCardType } from "@/lib/news/shorts/types";

type BreakingHeroProps = {
  lead: HomeArticle;
  topStories: HomeArticle[];
  featuredShort?: ShortCardType;
};

export function BreakingHero({
  lead,
  topStories,
  featuredShort,
}: BreakingHeroProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const showLive = lead.isLive || lead.ranking.isBreaking;

  return (
    <section
      className="nr-hero-zone nr-hero-zone--daily hp-lead-zone motion-hero"
      aria-labelledby="nr-breaking-hero-title"
    >
      <div className="nr-wrap nr-hero-zone__inner hp-lead-zone__grid">
        <article className="nr-breaking-hero nr-breaking-hero--daily">
          <TrackedStoryLink
            href={`/story/${lead.slug}`}
            slug={lead.slug}
            category={lead.section}
            region={lead.section}
            surface="breaking"
            className="nr-breaking-hero__link"
          >
            <div className="nr-breaking-hero__copy">
              {showLive ? (
                <span className="nr-live-badge nr-live-badge--compact motion-hero__flag">
                  <span className="nr-live-badge__dot" aria-hidden />
                  LIVE
                </span>
              ) : (
                <span className="nr-breaking-hero__flag motion-hero__flag">
                  Breaking
                </span>
              )}

              <h2
                id="nr-breaking-hero-title"
                className="nr-breaking-hero__headline motion-hero__headline"
                lang={lead.language === "hi" ? "hi" : undefined}
              >
                {lead.headline}
              </h2>

              <div className="nr-breaking-hero__meta motion-hero__meta">
                <span>{lead.categoryLabel}</span>
                <span aria-hidden> · </span>
                <time dateTime={lead.publishedAt}>
                  {formatHomeTime(lead.publishedAt)}
                </time>
              </div>
            </div>

            <div className="nr-breaking-hero__visual motion-hero__visual">
              <HomeArticleImage
                src={lead.imageUrl}
                alt=""
                priority
                sizes={IMG_HERO_LEAD}
                category={lead.tags[0] ?? lead.section}
              />
            </div>
          </TrackedStoryLink>
        </article>

        {(featuredShort || topStories.length > 0) ? (
          <aside className="hp-lead-sidebar" aria-label="Top stories">
            {topStories.length > 0 ? (
              <div className="hp-top-stories">
                <h3 className="hp-top-stories__title">Top stories</h3>
                <ul className="hp-top-stories__list" role="list">
                  {topStories.map((story, index) => (
                    <li key={story.id} className="hp-top-stories__item">
                      <TrackedStoryLink
                        href={`/story/${story.slug}`}
                        slug={story.slug}
                        category={story.section}
                        region={story.section}
                        surface="homepage"
                        listPosition={index + 1}
                        className="hp-top-stories__link tap-target"
                      >
                        <div className="hp-top-stories__thumb">
                          <HomeArticleImage
                            src={story.imageUrl}
                            alt=""
                            sizes={IMG_HERO_THUMB}
                            category={story.tags[0] ?? story.section}
                          />
                        </div>
                        <div>
                          <h4
                            className="hp-top-stories__headline"
                            lang={story.language === "hi" ? "hi" : undefined}
                          >
                            {story.headline}
                          </h4>
                          <time
                            className="hp-top-stories__time"
                            dateTime={story.publishedAt}
                          >
                            {formatHomeTime(story.publishedAt)}
                          </time>
                        </div>
                      </TrackedStoryLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {featuredShort ? (
              <BreakingHeroReel short={featuredShort} />
            ) : null}
          </aside>
        ) : null}

        {/* Mobile: horizontal reel + story rail */}
        <div className="nr-hero-zone__media-row nr-hero-zone__media-row--daily">
          {featuredShort ? (
            <BreakingHeroReel short={featuredShort} />
          ) : null}

          {topStories.length > 0 ? (
            <div className="nr-hero-stories nr-hero-stories--daily">
              <h3 className="nr-hero-stories__title">More today</h3>
              <div
                ref={scrollRef}
                className="nr-hero-stories__scroll"
                role="list"
              >
                {topStories.map((story, index) => (
                  <article
                    key={story.id}
                    role="listitem"
                    className="nr-hero-story-card"
                  >
                    <TrackedStoryLink
                      href={`/story/${story.slug}`}
                      slug={story.slug}
                      category={story.section}
                      region={story.section}
                      surface="homepage"
                      listPosition={index + 1}
                      className="nr-hero-story-card__link tap-target"
                    >
                      <div className="nr-hero-story-card__thumb">
                        <HomeArticleImage
                          src={story.imageUrl}
                          alt=""
                          sizes={IMG_HERO_THUMB}
                          category={story.tags[0] ?? story.section}
                        />
                      </div>
                      <h4
                        className="nr-hero-story-card__headline"
                        lang={story.language === "hi" ? "hi" : undefined}
                      >
                        {story.headline}
                      </h4>
                      <time
                        className="nr-hero-story-card__time"
                        dateTime={story.publishedAt}
                      >
                        {formatHomeTime(story.publishedAt)}
                      </time>
                    </TrackedStoryLink>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
