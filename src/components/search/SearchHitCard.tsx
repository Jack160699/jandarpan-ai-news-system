import Link from "next/link";
import Image from "next/image";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import type { SearchHit } from "@/lib/search/types";

type SearchHitCardProps = {
  hit: SearchHit;
  onNavigate?: () => void;
  priority?: boolean;
};

/** Shared search result row — reuses feed-news-card / card-system markup. */
export function SearchHitCard({
  hit,
  onNavigate,
  priority = false,
}: SearchHitCardProps) {
  return (
    <li className="search-results__item" role="option">
      <article className="feed-news-card feed-news-card--compact search-feed-card">
        <div className="feed-news-card__main">
          <Link
            href={`/story/${hit.slug}`}
            className="feed-news-card__link tap-target search-feed-card__link"
            onClick={onNavigate}
          >
            <div className="feed-news-card__media">
              {hit.imageUrl ? (
                <Image
                  src={hit.imageUrl}
                  alt=""
                  fill
                  sizes="88px"
                  loading={priority ? undefined : "lazy"}
                  priority={priority}
                  placeholder="blur"
                  blurDataURL={IMAGE_BLUR}
                  className="object-cover"
                />
              ) : (
                <div
                  className="search-feed-card__media-fallback"
                  aria-hidden
                />
              )}
            </div>
            <div className="feed-news-card__content">
              <h3 className="feed-news-card__headline">{hit.headline}</h3>
              {hit.summary ? (
                <p className="feed-news-card__summary">{hit.summary}</p>
              ) : null}
              <div className="feed-news-card__meta">
                <span className="feed-news-card__meta-category">
                  {hit.section}
                </span>
                {hit.district ? (
                  <>
                    <span className="feed-news-card__meta-sep" aria-hidden>
                      ·
                    </span>
                    <span>{hit.district}</span>
                  </>
                ) : null}
                {hit.readingTime ? (
                  <>
                    <span className="feed-news-card__meta-sep" aria-hidden>
                      ·
                    </span>
                    <span>{hit.readingTime}</span>
                  </>
                ) : null}
              </div>
            </div>
          </Link>
        </div>
      </article>
    </li>
  );
}
