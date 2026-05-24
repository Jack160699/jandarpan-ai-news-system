"use client";

import Link from "next/link";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { BreakingHeroReel } from "@/sections/homepage/BreakingHeroReel";
import { IMG_HERO_LEAD, IMG_HERO_THUMB } from "@/lib/images/homepage-sizes";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
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
  const { t } = useLanguage();
  const showBadge = lead.isLive || lead.ranking.isBreaking;

  return (
    <section
      className="hero-news-card hero-news-card--premium pl-scroll-target"
      aria-labelledby="hero-lead-title"
    >
      <article className="hero-news-card__article hero-news-card__article--premium">
        <TrackedStoryLink
          href={`/story/${lead.slug}`}
          slug={lead.slug}
          category={lead.section}
          region={lead.section}
          surface="breaking"
          className="hero-news-card__link hero-news-card__link--premium"
        >
          <div className="hero-news-card__copy">
            {showBadge ? (
              <span className="hero-news-card__live-badge">
                <span className="hero-news-card__live-dot" aria-hidden />
                {lead.isLive ? t.common.live : t.common.breakingLabel}
              </span>
            ) : null}

            <h2
              id="hero-lead-title"
              className="hero-news-card__headline hero-news-card__headline--premium hi"
              lang={lead.language === "hi" ? "hi" : undefined}
            >
              {lead.headline}
            </h2>

            {lead.summary ? (
              <p className="hero-news-card__summary">{lead.summary}</p>
            ) : null}

            <div className="hero-news-card__meta hero-news-card__meta--premium">
              <span className="hero-news-card__meta-category">
                {lead.categoryLabel}
              </span>
              <span aria-hidden> · </span>
              <time dateTime={lead.publishedAt}>
                {formatHomeTime(lead.publishedAt)}
              </time>
              {lead.readingTime ? (
                <>
                  <span aria-hidden> · </span>
                  <span>{lead.readingTime}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="hero-news-card__visual hero-news-card__visual--premium">
            <HomeArticleImage
              src={lead.imageUrl}
              alt=""
              priority
              sizes={IMG_HERO_LEAD}
              category={lead.tags[0] ?? lead.section}
            />
            <span className="hero-news-card__visual-overlay" aria-hidden />
            {featuredShort ? (
              <Link
                href={`/shorts/${featuredShort.slug}`}
                className="hero-news-card__play"
                aria-label="Watch video"
                onClick={(e) => e.stopPropagation()}
              >
                <span aria-hidden>▶</span>
              </Link>
            ) : null}
          </div>
        </TrackedStoryLink>
      </article>

      {(topStories.length > 0 || featuredShort) ? (
        <aside className="hero-news-card__sidebar pl-hide-mobile" aria-label="Top stories">
          {topStories.length > 0 ? (
            <div className="hero-news-card__rail">
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
          {topStories.slice(0, 4).map((story, index) => (
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
    </section>
  );
}
