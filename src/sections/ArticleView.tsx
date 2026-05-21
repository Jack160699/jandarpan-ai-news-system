"use client";

import Link from "next/link";
import type { Article } from "@/lib/articles";
import {
  ArticleHeroImage,
  ArticleMetaBar,
  ArticlePullQuote,
} from "@/components/article";
import { ArticleMemoryTracker } from "@/components/editorial/ArticleMemoryTracker";
import { CuriosityTrail } from "@/components/editorial/CuriosityTrail";
import { EditorialBookmark } from "@/components/editorial/EditorialBookmark";
import { ArticleUnfold } from "@/components/layout/ArticleUnfold";
import { ReadingProgress } from "@/components/layout/ReadingProgress";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  EditorialSignature,
  FilingReference,
  StoryLegacyMarker,
} from "@/components/institution";
import { getStoryLegacy } from "@/lib/story-legacy";
import { useLocalizedHeadline } from "@/hooks/useLocalizedHeadline";

type ArticleViewProps = {
  article: Article;
};

export function ArticleView({ article }: ArticleViewProps) {
  const legacy = getStoryLegacy(article.slug);
  const localized = useLocalizedHeadline(article);
  const mid = Math.floor(article.paragraphs.length / 2);
  const beforeQuote = article.paragraphs.slice(0, mid);
  const afterQuote = article.paragraphs.slice(mid);

  return (
    <>
      <ArticleMemoryTracker slug={article.slug} title={article.title} />
      <ReadingProgress target="article" />

      <ArticleUnfold>
        <article data-reading="article" className="article-page article-flow">
          <div className="editorial-container">
            <div className="article-page__toolbar">
              <Link href="/" className="article-page__back">
                ← Back to edition
              </Link>
              <EditorialBookmark slug={article.slug} />
            </div>

            {legacy ? (
              <StoryLegacyMarker legacy={legacy} className="mt-4" />
            ) : null}

            <header className="article-header">
              <SectionLabel className="article-header__category">
                {localized.kicker}
              </SectionLabel>
              {legacy?.archiveRef ? (
                <FilingReference
                  refId={legacy.archiveRef}
                  filed={legacy.lastUpdated}
                  className="mb-2"
                />
              ) : null}
              {localized.showHindiSub && localized.hindiSub ? (
                <p className="headline-hi headline-hi--primary mb-2">
                  {localized.hindiSub}
                </p>
              ) : null}
              <h1 className="article-header__title">{localized.title}</h1>
              <p className="article-header__deck">{article.deck}</p>
            </header>

            <ArticleMetaBar article={article} />

            <ArticleHeroImage
              src={article.image}
              credit={article.imageCredit}
            />

            <div className="article-prose">
              {beforeQuote.map((p, i) => (
                <p
                  key={i}
                  className={i === 0 ? "article-prose__lede" : undefined}
                >
                  {p}
                </p>
              ))}

              <ArticlePullQuote attribution={article.author}>
                {article.pullQuote}
              </ArticlePullQuote>

              {afterQuote.length > 4 ? (
                <hr className="article-break" aria-hidden />
              ) : null}

              {afterQuote.map((p, i) => (
                <p key={i + mid}>{p}</p>
              ))}
            </div>

            <footer className="article-footer">
              <EditorialSignature
                author={article.author}
                role={article.role}
                slug={article.slug}
              />
              <CuriosityTrail
                currentSlug={article.slug}
                title="Related from the desk"
              />
              <p className="article-footer__end">
                End of filing ·{" "}
                <Link
                  href="/"
                  className="text-[var(--accent-category)] hover:underline"
                >
                  Return to edition
                </Link>
              </p>
            </footer>
          </div>
        </article>
      </ArticleUnfold>
    </>
  );
}
