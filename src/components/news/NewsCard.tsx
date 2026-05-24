"use client";

import Link from "next/link";
import { ArticleCardActions } from "@/components/article/ArticleCardActions";
import { MediaImage } from "@/components/media/MediaImage";
import {
  IMG_CARD_COMPACT,
  IMG_CARD_FEATURED,
  IMG_CARD_FEED,
} from "@/lib/images/homepage-sizes";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import type { FeedStory } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

type NewsCardProps = {
  story: FeedStory;
  variant?: "horizontal" | "featured" | "compact";
  priority?: boolean;
  showExcerpt?: boolean;
};

function storyCategory(story: FeedStory): string {
  return story.kicker.toLowerCase().replace(/\s+/g, "-") || "world";
}

function Badges({ story }: { story: FeedStory }) {
  const { t } = useLanguage();
  return (
    <div className="feed-card__badges">
      {story.isLive ? (
        <span className="feed-badge feed-badge--live">
          <span className="feed-badge__dot" aria-hidden />
          {t.common.live}
        </span>
      ) : null}
      {story.isBreaking && !story.isLive ? (
        <span className="feed-badge feed-badge--breaking">
          {t.common.breakingLabel}
        </span>
      ) : null}
    </div>
  );
}

export function NewsCard({
  story,
  variant = "horizontal",
  priority = false,
  showExcerpt = false,
}: NewsCardProps) {
  const { language } = useLanguage();
  const localized = localizeFeedStory(story, language);
  const href = `/story/${story.slug}`;
  const category = storyCategory(story);

  if (variant === "featured") {
    return (
      <article className="feed-card pcard pcard--news pcard--news-featured feed-card--featured">
        <Link
          href={href}
          prefetch={false}
          className="story-link feed-card__link feed-card__link--featured tap-target group"
        >
          <div className="feed-card__media feed-card__media--featured">
            <MediaImage
              src={story.image}
              alt=""
              sizes={IMG_CARD_FEATURED}
              category={category}
              aspect="16:9"
              priority={priority}
              fillParent
              cinematic={false}
              imageClassName="image-ink"
            />
          </div>
          <div className="feed-card__body">
            <div className="feed-card__meta-row">
              <span className="feed-card__category">{localized.kicker}</span>
              <Badges story={story} />
            </div>
            {localized.showSecondary && localized.secondaryTitle ? (
              <p className="feed-card__title-hi headline-hi">
                {localized.secondaryTitle}
              </p>
            ) : null}
            <h2 className="feed-card__title feed-card__title--featured">
              {localized.title}
            </h2>
            {showExcerpt ? (
              <p className="feed-card__excerpt">{localized.excerpt}</p>
            ) : null}
            <p className="feed-card__time">
              {story.filedAt}
              {story.city ? ` · ${story.city}` : ""} · {story.readTime}
            </p>
          </div>
        </Link>
        <ArticleCardActions
          articleId={story.slug}
          headline={localized.title}
          summary={localized.excerpt}
          slugOrPath={story.slug}
        />
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="feed-card pcard pcard--news pcard--news-compact feed-card--compact">
        <Link
          href={href}
          prefetch={false}
          className="story-link feed-card__link feed-card__link--compact tap-target group"
        >
          <div className="feed-card__media feed-card__media--compact shrink-0">
            <MediaImage
              src={story.image}
              alt=""
              sizes={IMG_CARD_COMPACT}
              category={category}
              aspect="4:5"
              fillParent
              cinematic={false}
              imageClassName="image-ink"
            />
          </div>
          <div className="feed-card__body min-w-0 flex-1 py-0.5">
            <span className="feed-card__category">{localized.kicker}</span>
            <h3 className="feed-card__title feed-card__title--compact line-clamp-2">
              {localized.title}
            </h3>
            <p className="feed-card__time">{story.filedAt}</p>
          </div>
        </Link>
        <ArticleCardActions
          articleId={story.slug}
          headline={localized.title}
          summary={localized.excerpt}
          slugOrPath={story.slug}
        />
      </article>
    );
  }

  return (
    <article className="feed-card pcard pcard--news pcard--news-horizontal feed-card--horizontal">
      <Link
        href={href}
        prefetch={false}
        className="story-link feed-card__link feed-card__link--horizontal tap-target group"
      >
        <div className="feed-card__media feed-card__media--horizontal shrink-0">
          <MediaImage
            src={story.image}
            alt=""
            sizes={IMG_CARD_FEED}
            category={category}
            aspect="4:5"
            priority={priority}
            fillParent
            cinematic={false}
            imageClassName="image-ink"
          />
        </div>
        <div className="feed-card__body min-w-0 flex-1">
          <div className="feed-card__meta-row">
            <span className="feed-card__category">{localized.kicker}</span>
            <Badges story={story} />
          </div>
          <h3 className="feed-card__title line-clamp-2">{localized.title}</h3>
          <p className="feed-card__time">
            {story.filedAt}
            {story.city ? ` · ${story.city}` : ""}
          </p>
        </div>
      </Link>
      <ArticleCardActions
        articleId={story.slug}
        headline={localized.title}
        summary={localized.excerpt}
        slugOrPath={story.slug}
      />
    </article>
  );
}
