"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { articles, HERO_ARTICLE_SLUG } from "@/lib/articles";
import { Byline } from "@/components/ui/Byline";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ContinueReading } from "@/components/newspaper/ContinueReading";
import { NarrativeImage } from "@/components/newspaper/NarrativeImage";
import { TypographyCinema } from "@/components/cinema/TypographyCinema";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsMobile } from "@/hooks/useMediaQuery";

const article = articles[HERO_ARTICLE_SLUG];
const HEADLINE_LINES = [
  "When the Naya Raipur",
  "file went",
  "missing",
];
const HANDOFF_PARAS = article.paragraphs.slice(0, 2);

export function PinnedNarrativeHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const handoffRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const usePin = !reduced && !isMobile;

  useEffect(() => {
    if (!usePin || !wrapRef.current || !panelRef.current) return;

    const lines = linesRef.current?.querySelectorAll("[data-hero-line]");
    const handoff = handoffRef.current;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "+=220%",
          pin: panelRef.current,
          scrub: 1.25,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      if (lines?.length) {
        tl.to(
          lines,
          {
            scale: 0.88,
            y: -40,
            opacity: 0.35,
            stagger: 0.04,
            ease: "none",
            transformOrigin: "left bottom",
          },
          0
        );
      }

      if (textRef.current) {
        tl.to(textRef.current, { y: -20, ease: "none" }, 0);
      }

      if (imageLayerRef.current) {
        tl.to(
          imageLayerRef.current,
          { opacity: 0.55, scale: 1.02, filter: "blur(1px)", ease: "none" },
          0.35
        );
      }

      if (handoff) {
        tl.to(handoff, { opacity: 1, y: 0, ease: "power2.out" }, 0.55);
        tl.fromTo(
          handoff.querySelectorAll("[data-handoff-p]"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, stagger: 0.14, ease: "none" },
          0.62
        );
      }
    }, wrapRef);

    return () => ctx.revert();
  }, [usePin]);

  useEffect(() => {
    if (usePin || reduced || !handoffRef.current) return;
    gsap.set(handoffRef.current, { opacity: 1, y: 0 });
  }, [usePin, reduced]);

  return (
    <div
      ref={wrapRef}
      className="pinned-hero-wrap"
      data-section="hero"
      data-atmosphere="warm"
      style={usePin ? { height: "220vh" } : undefined}
    >
      <div
        ref={panelRef}
        className={`pinned-hero-panel bg-[var(--paper)] ${!usePin ? "!h-auto min-h-[100dvh]" : ""}`}
      >
        <div
          ref={imageLayerRef}
          className={`pinned-hero-layer z-0 ${isMobile ? "relative h-[42vh] shrink-0" : "hidden md:block"}`}
        >
          <div className={isMobile ? "h-full" : "absolute inset-0 lg:left-[38%]"}>
            <NarrativeImage
              src={article.image}
              alt=""
              variant="hero"
              revealDelay={0.3}
              enableZoom={usePin}
              enablePan
              wrapperClassName="h-full"
              className="h-full min-h-full"
            />
          </div>
          {!isMobile ? (
            <div
              className="absolute inset-0 bg-gradient-to-r from-[var(--paper)] via-[var(--paper)]/85 to-transparent"
              aria-hidden
            />
          ) : null}
        </div>

        <div className="pinned-hero-layer z-10 flex h-full flex-col">
          <div className="editorial-container flex flex-1 flex-col justify-end px-[var(--space-gutter)] pb-12 pt-6 md:pb-16 md:pt-28">
            <SectionLabel className="mb-4">
              {article.kicker}
              {article.kickerHi ? ` · ${article.kickerHi}` : ""}
            </SectionLabel>

            <div ref={textRef} className="relative max-w-xl">
              <div ref={linesRef}>
                <h1 className="sr-only">{article.title}</h1>
                {article.titleHi ? (
                  <p
                    className="mb-3 text-lg text-[var(--ink-muted)] md:text-xl"
                    style={{ fontFamily: "var(--font-hindi)" }}
                  >
                    {article.titleHi}
                  </p>
                ) : null}
                <TypographyCinema>
                  <div aria-hidden className="space-y-1 md:space-y-2">
                    {HEADLINE_LINES.map((line, i) => (
                      <span
                        key={line}
                        data-hero-line
                        className="headline-hero-line block origin-left will-change-transform"
                        style={{
                          paddingLeft:
                            i === 1 ? "clamp(0.5rem, 4vw, 2rem)" : 0,
                        }}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </TypographyCinema>
              </div>

              <p className="deck reading-measure lede mt-8 md:mt-10">
                {article.deck}
              </p>

              <div className="mt-8">
                <Byline author={article.author} role={article.role} />
                <p className="meta-label mt-2 text-[var(--ink-faint)]">
                  {article.filedFrom}
                </p>
              </div>
            </div>

            <div
              ref={handoffRef}
              className={`mt-10 max-w-2xl md:mt-14 ${usePin ? "pinned-hero-handoff" : ""}`}
            >
              <p className="meta-label mb-6 text-[var(--ink-faint)]">
                खोज जारी · The filing opens
              </p>
              {HANDOFF_PARAS.map((p, i) => (
                <p
                  key={i}
                  data-handoff-p
                  className={`editorial-body ${i === 0 ? "drop-cap text-lg" : "mt-6"}`}
                >
                  {p}
                </p>
              ))}
              <div className="thumb-zone mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <ContinueReading
                  href={`/story/${HERO_ARTICLE_SLUG}`}
                  hint="Investigations · Part I"
                  label="पूरी रिपोर्ट पढ़ें"
                />
                <Link
                  href={`/story/${HERO_ARTICLE_SLUG}`}
                  className="meta-label text-[var(--ink-muted)]"
                >
                  {article.readTime}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
