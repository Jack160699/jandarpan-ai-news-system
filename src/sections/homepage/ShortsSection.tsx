"use client";

import Link from "next/link";
import { HomeArticleImage } from "@/components/homepage/HomeArticleImage";
import type { HomeArticle } from "@/lib/homepage/types";

type ShortsSectionProps = {
  articles: HomeArticle[];
};

export function ShortsSection({ articles }: ShortsSectionProps) {
  if (!articles.length) return null;

  return (
    <section className="hp__section" aria-labelledby="hp-shorts-title">
      <div className="hp__inner">
        <div className="hp__title-row">
          <div>
            <p className="hp__kicker">Quick read</p>
            <h2 id="hp-shorts-title" className="hp__title">
              Shorts
            </h2>
          </div>
          <span className="hp__title-hi">शॉर्ट्स</span>
        </div>
      </div>
      <div
        className="hp-shorts"
        role="list"
        aria-label="Short reads — swipe on mobile"
      >
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/story/${article.slug}`}
            className="hp-shorts__card"
            role="listitem"
          >
            <div className="hp-shorts__visual">
              <HomeArticleImage
                src={article.imageUrl}
                alt=""
                sizes="(max-width: 640px) 72vw, 12rem"
              />
            </div>
            <div className="hp-shorts__body">
              <p className="hp-shorts__headline">{article.headline}</p>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-[var(--ink-muted)]">
                {article.readingTime}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
