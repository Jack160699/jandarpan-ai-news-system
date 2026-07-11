"use client";

import Link from "next/link";
import Image from "next/image";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import type { SearchHit } from "@/lib/search/types";
import { cn } from "@/lib/cn";

type ArticleSearchProps = {
  hit: SearchHit;
  index: number;
  active?: boolean;
  optionId?: string;
  onNavigate?: () => void;
  onHover?: () => void;
  priority?: boolean;
};

export function ArticleSearch({
  hit,
  index,
  active = false,
  optionId,
  onNavigate,
  onHover,
  priority = false,
}: ArticleSearchProps) {
  return (
    <li
      className={cn("search-v3-article", active && "search-v3-article--active")}
      role="option"
      id={optionId}
      aria-selected={active}
      data-index={index}
      onMouseEnter={onHover}
    >
      <article className="search-v3-article__card">
        <Link
          href={`/story/${hit.slug}`}
          className="search-v3-article__link tap-target"
          onClick={onNavigate}
          tabIndex={-1}
        >
          <div className="search-v3-article__media">
            {hit.imageUrl ? (
              <Image
                src={hit.imageUrl}
                alt=""
                fill
                sizes="80px"
                loading={priority ? undefined : "lazy"}
                priority={priority}
                placeholder="blur"
                blurDataURL={IMAGE_BLUR}
                className="object-cover"
              />
            ) : (
              <div className="search-v3-article__media-fallback" aria-hidden />
            )}
          </div>
          <div className="search-v3-article__body">
            <h3 className="search-v3-article__headline">{hit.headline}</h3>
            {hit.summary ? (
              <p className="search-v3-article__summary">{hit.summary}</p>
            ) : null}
            <div className="search-v3-article__meta">
              <span>{hit.section}</span>
              {hit.district ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{hit.district}</span>
                </>
              ) : null}
              {hit.readingTime ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{hit.readingTime}</span>
                </>
              ) : null}
            </div>
          </div>
        </Link>
      </article>
    </li>
  );
}
