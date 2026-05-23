"use client";

import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { BreakingHeroReel } from "@/sections/homepage/BreakingHeroReel";
import { IMG_HERO_LEAD, IMG_HERO_THUMB } from "@/lib/images/homepage-sizes";
import { formatHomeTime } from "@/lib/homepage/format";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type HeroNewsCardProps = {
  lead: HomeArticle;
  topStories: HomeArticle[];
  featuredShort?: NewsShortCard;
};

export function HeroNewsCard({
  lead,
  topStories,
  featuredShort,
}: HeroNewsCardProps) {
  const showLive = lead.isLive || lead.ranking.isBreaking;

  return (
    <section className="hero-news-card pl-scroll-target" aria-labelledby="hero-lead-title">
      <div className="hero-news-card__layout">
        <article className="hero-news-card__article">
          <TrackedStoryLink
            href={`/story/${lead.slug}`}
            slug={lead.slug}
            category={lead.section}
            region={lead.section}
            surface="breaking"
            className="hero-news-card__link"
          >
            <div className="hero-news-card__copy">
              <span className="hero-news-card__kicker">
                {showLive ? "LIVE" : "Breaking"}
              </span>
              <h2
                id="hero-lead-title"
                className="hero-news-card__headline hi"
                lang={lead.language === "hi" ? "hi" : undefined}
              >
                {lead.headline}
              </h2>
              <div className="hero-news-card__meta">
                <span className="hero-news-card__meta-category">
                  {lead.categoryLabel}
                </span>
                <span aria-hidden> · </span>
                <time dateTime={lead.publishedAt}>
                  {formatHomeTime(lead.publishedAt)}
                </time>
              </div>
            </div>
            <div className="hero-news-card__visual">
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

        {(topStories.length > 0 || featuredShort) ? (
          <aside className="hero-news-card__sidebar" aria-label="Top stories">
            {topStories.length > 0 ? (
              <div className="hero-news-card__rail">
                <h3 className="news-grid__title" style={{ fontSize: "var(--text-xs)", marginBottom: "0.5rem" }}>
                  Top stories
                </h3>
                {topStories.map((story, index) => (
                  <div key={story.id} className="hero-news-card__rail-item">
                    <TrackedStoryLink
                      href={`/story/${story.slug}`}
                      slug={story.slug}
                      category={story.section}
                      region={story.section}
                      surface="homepage"
                      listPosition={index + 1}
                      className="hero-news-card__rail-link"
                    >
                      <div className="hero-news-card__rail-thumb">
                        <HomeArticleImage
                          src={story.imageUrl}
                          alt=""
                          sizes={IMG_HERO_THUMB}
                          category={story.tags[0] ?? story.section}
                        />
                      </div>
                      <div>
                        <h4
                          className="hero-news-card__rail-title hi"
                          lang={story.language === "hi" ? "hi" : undefined}
                        >
                          {story.headline}
                        </h4>
                        <time
                          className="hero-news-card__rail-time"
                          dateTime={story.publishedAt}
                        >
                          {formatHomeTime(story.publishedAt)}
                        </time>
                      </div>
                    </TrackedStoryLink>
                  </div>
                ))}
              </div>
            ) : null}
            {featuredShort ? <BreakingHeroReel short={featuredShort} /> : null}
          </aside>
        ) : null}

        {topStories.length > 0 ? (
          <div className="hero-news-card__mobile-rail pl-mobile-only">
            {topStories.map((story, index) => (
              <article key={story.id} className="hero-news-card__mobile-card">
                <TrackedStoryLink
                  href={`/story/${story.slug}`}
                  slug={story.slug}
                  category={story.section}
                  region={story.section}
                  surface="homepage"
                  listPosition={index + 1}
                  className="hero-news-card__rail-link"
                >
                  <div className="hero-news-card__rail-thumb">
                    <HomeArticleImage
                      src={story.imageUrl}
                      alt=""
                      sizes={IMG_HERO_THUMB}
                      category={story.tags[0] ?? story.section}
                    />
                  </div>
                  <h4 className="hero-news-card__rail-title hi">{story.headline}</h4>
                </TrackedStoryLink>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
