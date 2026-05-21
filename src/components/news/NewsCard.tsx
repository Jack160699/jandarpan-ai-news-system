"use client";

import Image from "next/image";
import Link from "next/link";
import { localizeFeedStory } from "@/lib/i18n/localize-content";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import type { FeedStory } from "@/lib/home-feed";
import { useLanguage } from "@/providers/LanguageProvider";

type NewsCardProps = {
  story: FeedStory;
  variant?: "horizontal" | "featured" | "compact";
  priority?: boolean;
  showExcerpt?: boolean;
};

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

  if (variant === "featured") {
    return (
      <article className="feed-card feed-card--featured">
        <Link
          href={href}
          className="story-link feed-card__link feed-card__link--featured tap-target group"
        >
          <div className="feed-card__media feed-card__media--featured">
            <Image
              src={story.image}
              alt=""
              fill
              priority={priority}
              placeholder="blur"
              blurDataURL={IMAGE_BLUR}
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 100vw, 60vw"
              className="image-ink object-cover"
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
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="feed-card feed-card--compact">
        <Link
          href={href}
          className="story-link feed-card__link feed-card__link--compact tap-target group"
        >
          <div className="feed-card__media feed-card__media--compact shrink-0">
            <Image
              src={story.image}
              alt=""
              fill
              loading="lazy"
              placeholder="blur"
              blurDataURL={IMAGE_BLUR}
              sizes="72px"
              className="image-ink object-cover"
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
      </article>
    );
  }

  return (
    <article className="feed-card feed-card--horizontal">
      <Link
        href={href}
        className="story-link feed-card__link feed-card__link--horizontal tap-target group"
      >
        <div className="feed-card__media feed-card__media--horizontal shrink-0">
          <Image
            src={story.image}
            alt=""
            fill
            sizes="(max-width: 480px) 92px, 112px"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR}
            className="image-ink object-cover"
          />
        </div>
        <div className="feed-card__body min-w-0 flex-1">
          <div className="feed-card__meta-row">
            <span className="feed-card__category">{localized.kicker}</span>
            <Badges story={story} />
          </div>
          <h3 className="feed-card__title line-clamp-2">{localized.title}</h3>
          {showExcerpt ? (
            <p className="feed-card__excerpt line-clamp-1">{localized.excerpt}</p>
          ) : null}
          <p className="feed-card__time">
            {story.filedAt}
            {story.city ? ` · ${story.city}` : ""} · {story.readTime}
          </p>
        </div>
      </Link>
    </article>
  );
}
