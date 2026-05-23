import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { ConfidenceIndicator } from "@/components/homepage/ConfidenceIndicator";
import { DeskBadge } from "@/components/homepage/DeskBadge";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import { formatHomeTime } from "@/lib/homepage/format";
import { resolveDeskForCardVariant } from "@/lib/newsroom/desk-branding";
import type { HomeArticle } from "@/lib/homepage/types";

export type StoryCardVariant =
  | "editorial-lead"
  | "editorial"
  | "wire"
  | "breaking"
  | "compact"
  | "trending";

type StoryCardProps = {
  article: HomeArticle;
  variant: StoryCardVariant;
  priority?: boolean;
  rank?: number;
};

function variantDesk(article: HomeArticle, variant: StoryCardVariant) {
  if (variant === "wire" || variant === "breaking") {
    return resolveDeskForCardVariant(variant === "breaking" ? "breaking" : "wire");
  }
  return article.desk;
}

function showImage(variant: StoryCardVariant): boolean {
  return variant !== "wire";
}

function deskVariant(
  variant: StoryCardVariant
): "editorial" | "wire" | "breaking" {
  if (variant === "wire") return "wire";
  if (variant === "breaking") return "breaking";
  return "editorial";
}

export function StoryCard({
  article,
  variant,
  priority = false,
  rank,
}: StoryCardProps) {
  const desk = variantDesk(article, variant);
  const deskV = deskVariant(variant);
  const hasImage = showImage(variant);
  const summary =
    article.summary.trim() ||
    "Brief update from the newsroom desk — open for full coverage.";

  const tags = article.tags.slice(0, 3);
  const clickSurface =
    variant === "breaking" ? "breaking" : ("homepage" as const);

  return (
    <article
      className={`nr-card nr-card--${variant}`}
      data-variant={variant}
    >
      <TrackedStoryLink
        href={`/story/${article.slug}`}
        slug={article.slug}
        category={article.section}
        region={article.section}
        surface={clickSurface}
        listPosition={rank}
        className="nr-card__link"
        aria-label={`${article.headline}, ${article.categoryLabel}`}
      >
        {hasImage ? (
          <div className="nr-card__media">
            <HomeArticleImage
              src={article.imageUrl}
              alt=""
              priority={priority}
              sizes={
                variant === "editorial-lead"
                  ? "(max-width: 768px) 100vw, 65vw"
                  : variant === "compact"
                    ? "11rem"
                    : variant === "editorial"
                      ? "(max-width: 640px) 100vw, 33vw"
                      : "(max-width: 768px) 100vw, 40vw"
              }
            />
            {variant === "breaking" || article.ranking.isBreaking ? (
              <span className="nr-card__flag nr-card__flag--breaking">Breaking</span>
            ) : null}
            {variant === "editorial" || variant === "editorial-lead" ? (
              <span className="nr-card__flag nr-card__flag--ai">AI Editorial</span>
            ) : null}
            {variant === "wire" && article.isLive ? (
              <span className="nr-card__flag nr-card__flag--live">Live</span>
            ) : null}
          </div>
        ) : null}

        <div className="nr-card__body">
          <div className="nr-card__top">
            {typeof rank === "number" ? (
              <span className="nr-card__rank" aria-hidden>
                {String(rank).padStart(2, "0")}
              </span>
            ) : null}
            <div className="nr-card__badges">
              <DeskBadge desk={desk} variant={deskV} />
              {variant === "wire" && article.isLive ? (
                <span className="nr-card__live-pill">Live</span>
              ) : null}
            </div>
          </div>

          <h3 className="nr-card__headline">{article.headline}</h3>

          {variant !== "wire" && variant !== "compact" ? (
            <p className="nr-card__summary">{summary}</p>
          ) : variant === "compact" ? (
            <p className="nr-card__summary nr-card__summary--short">{summary}</p>
          ) : null}

          <div className="nr-card__meta">
            <span className="nr-card__meta-item">{article.categoryLabel}</span>
            <span className="nr-card__meta-dot" aria-hidden>
              ·
            </span>
            <span className="nr-card__meta-item">{article.readingTime}</span>
            <span className="nr-card__meta-dot" aria-hidden>
              ·
            </span>
            <time className="nr-card__meta-item" dateTime={article.publishedAt}>
              {formatHomeTime(article.publishedAt)}
            </time>
            {article.sourceCount > 0 && variant !== "wire" ? (
              <>
                <span className="nr-card__meta-dot" aria-hidden>
                  ·
                </span>
                <span className="nr-card__meta-item">
                  {article.sourceCount}{" "}
                  {article.sourceCount === 1 ? "source" : "sources"}
                </span>
              </>
            ) : null}
          </div>

          {variant !== "wire" ? (
            <div className="nr-card__footer">
              {tags.length > 0 ? (
                <ul className="nr-card__tags" aria-label="Tags">
                  {tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
              <ConfidenceIndicator score={article.aiConfidence} />
            </div>
          ) : (
            <ConfidenceIndicator
              score={article.aiConfidence}
              showLabel={false}
            />
          )}
        </div>
      </TrackedStoryLink>
    </article>
  );
}
