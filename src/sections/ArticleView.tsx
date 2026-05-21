"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { Article } from "@/lib/articles";
import { ArticleMemoryTracker } from "@/components/editorial/ArticleMemoryTracker";
import { CuriosityTrail } from "@/components/editorial/CuriosityTrail";
import { EditorialBookmark } from "@/components/editorial/EditorialBookmark";
import { ArticleUnfold } from "@/components/layout/ArticleUnfold";
import { ReadingProgress } from "@/components/layout/ReadingProgress";
import { ChapterSeparator } from "@/components/cinema/ChapterSeparator";
import { CinematicQuote } from "@/components/cinema/CinematicQuote";
import { NarrativeArc } from "@/components/cinema/NarrativeArc";
import { NarrativeTypography } from "@/components/cinema/NarrativeTypography";
import { VisualDecompression } from "@/components/cinema/VisualDecompression";
import { TypographyCinema } from "@/components/cinema/TypographyCinema";
import { NarrativeImage } from "@/components/newspaper/NarrativeImage";
import { IncompleteReveal } from "@/components/motion/IncompleteReveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Rule } from "@/components/ui/Rule";
import { Byline } from "@/components/ui/Byline";
import {
  EditorialSignature,
  FilingReference,
  StoryLegacyMarker,
} from "@/components/institution";
import { getStoryLegacy } from "@/lib/story-legacy";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useLocalizedHeadline } from "@/hooks/useLocalizedHeadline";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ArticleViewProps = {
  article: Article;
};

function getParagraphClass(index: number, total: number): string {
  if (index === 0) return "drop-cap";
  if (index === Math.floor(total * 0.35)) return "article-paragraph--pause";
  if (index === Math.floor(total * 0.7)) return "article-paragraph--breathe";
  if (index % 5 === 4) return "article-paragraph--breathe";
  return "";
}

export function ArticleView({ article }: ArticleViewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const ctx = useEditorialIntelligenceOptional();
  const mid = Math.floor(article.paragraphs.length / 2);
  const third = Math.floor(article.paragraphs.length / 3);
  const legacy = getStoryLegacy(article.slug);
  const localized = useLocalizedHeadline(article);

  useEffect(() => {
    if (reduced || !bodyRef.current) return;

    const pauseMult = ctx?.pacing.pauseMultiplier ?? 1;
    const paras = bodyRef.current.querySelectorAll("[data-article-p]");

    const gctx = gsap.context(() => {
      paras.forEach((p, i) => {
        gsap.from(p, {
          opacity: 0,
          y: i % 4 === 0 ? 16 : 8,
          duration: 1.35 * pauseMult,
          ease: "power2.out",
          scrollTrigger: {
            trigger: p,
            start: ctx?.pacing.isRushing ? "top 96%" : "top 92%",
            toggleActions: "play none none none",
          },
        });
      });
    }, bodyRef);

    return () => gctx.revert();
  }, [reduced, article.slug, ctx?.pacing.pauseMultiplier, ctx?.pacing.isRushing]);

  useEffect(() => {
    if (reduced || !quoteRef.current) return;

    const tween = gsap.from(quoteRef.current, {
      scale: 0.98,
      opacity: 0,
      duration: 1.8,
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: quoteRef.current,
        start: "top 78%",
        toggleActions: "play none none reverse",
      },
    });

    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <>
      <ArticleMemoryTracker slug={article.slug} title={article.title} />
      <ReadingProgress target="article" />

      <ArticleUnfold>
        <article
          data-reading="article"
          data-atmosphere="editorial"
          className="article-body article-flow mobile-comfort relative z-10 pb-36 pt-10 md:pt-14"
        >
          <div className="editorial-container">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="meta-label text-[var(--ink-muted)] transition-opacity duration-500 hover:opacity-60"
              >
                ← Edition
              </Link>
              <EditorialBookmark slug={article.slug} />
            </div>

            <NarrativeArc phase="opening">
            {legacy ? (
              <StoryLegacyMarker
                legacy={legacy}
                className="mt-8"
              />
            ) : null}

            <header className="section-breath--tight mt-10 max-w-4xl">
              <SectionLabel className="mb-4">{localized.kicker}</SectionLabel>
              {legacy?.archiveRef ? (
                <FilingReference
                  refId={legacy.archiveRef}
                  filed={legacy.lastUpdated}
                  className="mt-3"
                />
              ) : null}
              <IncompleteReveal initialClip={0.22}>
                <NarrativeTypography role="headline">
                  <TypographyCinema scaleOnScroll>
                    {localized.showHindiSub && localized.hindiSub ? (
                      <p
                        className="mb-4 text-lg text-[var(--ink-muted)] md:text-xl"
                        style={{ fontFamily: "var(--font-hindi)" }}
                      >
                        {localized.hindiSub}
                      </p>
                    ) : null}
                    <h1 className="display-lg max-w-[18ch]">{localized.title}</h1>
                  </TypographyCinema>
                </NarrativeTypography>
              </IncompleteReveal>
              <IncompleteReveal className="mt-10" delay={0.25}>
                <NarrativeTypography role="body">
                  <p className="deck reading-measure lede">{article.deck}</p>
                </NarrativeTypography>
              </IncompleteReveal>
              <div className="mt-10 flex flex-wrap items-baseline gap-6">
                <div>
                  <Byline author={article.author} role={article.role} />
                  <p className="meta-label mt-2 text-[var(--ink-faint)]">
                    {article.filedFrom}
                  </p>
                </div>
                <span className="meta-label text-[var(--ink-faint)]">
                  {article.readTime} · {article.category}
                </span>
              </div>
            </header>
            </NarrativeArc>

            <VisualDecompression label="— enter the filing —" />

            <NarrativeArc phase="rising">
              <div className="my-12 md:my-20">
                <NarrativeImage
                  src={article.image}
                  alt=""
                  credit={article.imageCredit}
                  variant="article"
                  revealDelay={0.45}
                  enableZoom
                  enablePan
                  wrapperClassName="max-w-5xl"
                />
              </div>
            </NarrativeArc>

            <Rule className="mb-14" />

            <div
              ref={bodyRef}
              className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-20"
            >
              <aside className="hidden lg:block lg:sticky lg:top-32 lg:self-start">
                <NarrativeTypography role="statement">
                  <blockquote className="pull-quote border-l-2 border-[var(--ink-primary)] pl-6 text-[var(--ink-primary)]">
                    {article.pullQuote}
                  </blockquote>
                </NarrativeTypography>
              </aside>

              <div className="reading-measure-wide">
                <NarrativeArc phase="opening">
                  <NarrativeTypography role="body">
                    {article.paragraphs.slice(0, third).map((p, i) => (
                      <p
                        key={i}
                        data-article-p
                        className={`editorial-body ${i > 0 ? "mt-7" : ""} ${getParagraphClass(i, article.paragraphs.length)}`}
                      >
                        {p}
                      </p>
                    ))}
                  </NarrativeTypography>
                </NarrativeArc>

                <NarrativeArc phase="rising">
                  <NarrativeTypography role="body">
                    {article.paragraphs.slice(third, mid).map((p, i) => (
                      <p
                        key={i + third}
                        data-article-p
                        className={`editorial-body mt-7 ${getParagraphClass(i + third, article.paragraphs.length)}`}
                      >
                        {p}
                      </p>
                    ))}
                  </NarrativeTypography>
                </NarrativeArc>

                <div ref={quoteRef}>
                  <NarrativeArc phase="peak">
                    <CinematicQuote>{article.pullQuote}</CinematicQuote>
                  </NarrativeArc>
                </div>

                <ChapterSeparator
                  chapter={
                    legacy
                      ? `Chapter ${Math.min(2, legacy.chapters.length)}`
                      : "Chapter II"
                  }
                  label={
                    legacy?.chapters[1]?.label ?? "The room grows quieter"
                  }
                />

                <VisualDecompression label="— editorial silence —" />

                <div className="section-gravitas" aria-hidden />

                <NarrativeArc phase="release">
                  <NarrativeTypography role="body">
                    {article.paragraphs.slice(mid).map((p, i) => (
                      <p
                        key={i + mid}
                        data-article-p
                        className={`editorial-body mt-7 ${getParagraphClass(i + mid, article.paragraphs.length)}`}
                      >
                        {p}
                      </p>
                    ))}
                  </NarrativeTypography>
                </NarrativeArc>
              </div>
            </div>

            <VisualDecompression />

            <EditorialSignature
              author={article.author}
              role={article.role}
              slug={article.slug}
            />

            <CuriosityTrail
              currentSlug={article.slug}
              title="The desk suggests"
            />
            <Rule className="mt-20" />
            <p className="meta-label mt-10 text-center text-[var(--ink-faint)]">
              End of filing ·{" "}
              <Link href="/" className="underline hover:opacity-60">
                Return to edition
              </Link>
            </p>
          </div>
        </article>
      </ArticleUnfold>
    </>
  );
}
