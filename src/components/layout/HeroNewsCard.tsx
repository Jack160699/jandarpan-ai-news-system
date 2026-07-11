"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { HeroCardActions } from "@/components/layout/HeroCardActions";
import { BreakingHeroReel } from "@/sections/homepage/BreakingHeroReel";
import { IMG_HERO_LEAD, IMG_HERO_THUMB } from "@/lib/images/homepage-sizes";
import { formatHomeTime } from "@/lib/homepage/format";
import { triggerHaptic } from "@/lib/mobile/haptics";
import {
  loadReadingMemory,
  toggleBookmark,
} from "@/lib/reading-memory";
import { pickDeskLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type HeroNewsCardProps = {
  lead: HomeArticle;
  topStories: HomeArticle[];
  featuredShort?: NewsShortCard;
};

function hasAiSummary(article: HomeArticle): boolean {
  return Boolean(article.summary?.trim()) && article.aiConfidence > 0;
}

export function HeroNewsCard({
  lead,
  topStories,
  featuredShort,
}: HeroNewsCardProps) {
  const { t, language } = useLanguage();
  const [saved, setSaved] = useState(false);

  const isLive = lead.isLive;
  const isBreaking = lead.ranking?.isBreaking ?? false;
  const showLiveBadge = isLive || isBreaking;
  const sourceLabel = pickDeskLabel(language, lead.desk);
  const showAiChip = hasAiSummary(lead);

  useEffect(() => {
    const memory = loadReadingMemory();
    setSaved(memory.bookmarks.includes(lead.slug));
  }, [lead.slug]);

  const onBookmark = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const memory = loadReadingMemory();
      const next = toggleBookmark(memory, lead.slug);
      const isSaved = next.bookmarks.includes(lead.slug);
      setSaved(isSaved);
      triggerHaptic(isSaved ? "success" : "light");
    },
    [lead.slug]
  );

  return (
    <section
      className="hero-news-card hero-news-card--premium hp-hero-enter pl-scroll-target"
      aria-labelledby="hero-lead-title"
    >
      <div className="hp-hero-kicker" aria-hidden={false}>
        <span className="hp-hero-kicker__label">{t.home.topHeadlines}</span>
      </div>

      <article className="hero-news-card__article hero-news-card__article--premium">
        <div className="hero-news-card__media-stack">
          <TrackedStoryLink
            href={`/story/${lead.slug}`}
            slug={lead.slug}
            category={lead.section}
            region={lead.section}
            surface="breaking"
            className="hero-news-card__visual-link"
          >
            <div className="hero-news-card__visual hero-news-card__visual--premium">
              <HomeArticleImage
                src={lead.imageUrl}
                alt=""
                priority
                sizes={IMG_HERO_LEAD}
                category={lead.tags[0] ?? lead.section}
              />
              <span className="hero-news-card__visual-overlay" aria-hidden />
            </div>
          </TrackedStoryLink>

          <div className="hero-news-card__float-top">
            <span className="hero-news-card__category-badge">
              {lead.categoryLabel}
            </span>
            {showLiveBadge ? (
              <span className="hero-news-card__live-badge" role="status">
                <span className="hero-news-card__live-dot" aria-hidden />
                {isLive ? t.common.live : t.common.breakingLabel}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className={`hero-news-card__bookmark tap-target${saved ? " is-saved" : ""}`}
            aria-label={saved ? t.article.bookmarked : t.article.bookmark}
            aria-pressed={saved}
            onClick={onBookmark}
          >
            <Bookmark
              className="hero-news-card__bookmark-icon"
              strokeWidth={2}
              fill={saved ? "currentColor" : "none"}
              aria-hidden
            />
          </button>

          {featuredShort ? (
            <Link
              href={`/shorts/${featuredShort.slug}`}
              className="hero-news-card__play tap-target"
              aria-label={t.shorts.watch}
              onClick={(e) => e.stopPropagation()}
            >
              <span aria-hidden>▶</span>
            </Link>
          ) : null}
        </div>

        <TrackedStoryLink
          href={`/story/${lead.slug}`}
          slug={lead.slug}
          category={lead.section}
          region={lead.section}
          surface="breaking"
          className="hero-news-card__body-link"
        >
          <h2
            id="hero-lead-title"
            className="hero-news-card__headline hero-news-card__headline--premium hi"
            lang={lead.language === "hi" ? "hi" : undefined}
          >
            {lead.headline}
          </h2>

          {lead.summary ? (
            <div className="hero-news-card__summary-block">
              {showAiChip ? (
                <span
                  className="hp-ai-chip"
                  title={t.article.transparencyTitle}
                >
                  {t.shorts.narrationShort}
                </span>
              ) : null}
              <p className="hero-news-card__summary">{lead.summary}</p>
            </div>
          ) : null}

          <div className="hero-news-card__meta hero-news-card__meta--premium">
            <time dateTime={lead.publishedAt}>
              {formatHomeTime(lead.publishedAt)}
            </time>
            {lead.readingTime ? (
              <>
                <span className="hero-news-card__meta-sep" aria-hidden>
                  ·
                </span>
                <span>{lead.readingTime}</span>
              </>
            ) : null}
            <span className="hero-news-card__meta-sep" aria-hidden>
              ·
            </span>
            <span className="hero-news-card__meta-source">{sourceLabel}</span>
          </div>
        </TrackedStoryLink>

        <HeroCardActions
          articleId={lead.id}
          headline={lead.headline}
          summary={lead.summary}
          slugOrPath={lead.slug}
          commentHref={`/story/${lead.slug}`}
          langHint={lead.language === "hi" ? "hi-IN" : "auto"}
        />
      </article>

      {(topStories.length > 0 || featuredShort) ? (
        <aside
          className="hero-news-card__sidebar pl-hide-mobile"
          aria-label={t.home.topHeadlines}
        >
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
    </section>
  );
}
