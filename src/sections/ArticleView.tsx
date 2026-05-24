"use client";

import Link from "next/link";
import type { Article } from "@/lib/articles";
import {
  ArticleCardActions,
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
import { localizeArticle } from "@/lib/i18n/localize-content";
import { getStoryLegacy } from "@/lib/story-legacy";
import { useLanguage } from "@/providers/LanguageProvider";

type ArticleViewProps = {
  article: Article;
};

export function ArticleView({ article }: ArticleViewProps) {
  const { language, t } = useLanguage();
  const legacy = getStoryLegacy(article.slug);
  const localized = localizeArticle(article, language);
  const mid = Math.floor(article.paragraphs.length / 2);
  const beforeQuote = article.paragraphs.slice(0, mid);
  const afterQuote = article.paragraphs.slice(mid);

  return (
    <>
      <ArticleMemoryTracker slug={article.slug} title={localized.title} />
      <ReadingProgress target="article" />

      <ArticleUnfold>
        <article data-reading="article" className="article-page article-flow">
          <div className="editorial-container">
            <div className="article-page__toolbar">
              <Link href="/" className="article-page__back tap-target">
                {t.article.back}
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
              {localized.showSecondary && localized.secondaryTitle ? (
                <p className="headline-hi headline-hi--primary mb-2">
                  {localized.secondaryTitle}
                </p>
              ) : null}
              <h1 className="article-header__title">{localized.title}</h1>
              <p className="article-header__deck">{localized.deck}</p>
            </header>

            <ArticleMetaBar article={article} />

            <ArticleCardActions
              articleId={article.slug}
              headline={localized.title}
              summary={[localized.deck, ...article.paragraphs.slice(0, 2)].join(" ")}
              slugOrPath={article.slug}
              className="article-page__actions"
              enableSpeedCycle
            />

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
                title={t.article.related}
              />
              <p className="article-footer__end">
                {t.article.endOfFiling} ·{" "}
                <Link
                  href="/"
                  className="text-[var(--accent-category)] hover:underline"
                >
                  {t.article.returnToEdition}
                </Link>
              </p>
            </footer>
          </div>
        </article>
      </ArticleUnfold>
    </>
  );
}
