"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { FolioChapter } from "@/lib/folio-chapters";
import { NarrativeImage } from "@/components/newspaper/NarrativeImage";
import { ContinueReading } from "@/components/newspaper/ContinueReading";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { refreshCinemaLayout } from "@/lib/cinema";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsMobile } from "@/hooks/useMediaQuery";

type FolioSequenceProps = {
  chapters: FolioChapter[];
  title?: string;
};

export function FolioSequence({
  chapters,
  title = "Inside the filing",
}: FolioSequenceProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (reduced || isMobile || !wrapRef.current || !pinRef.current || !railRef.current)
      return;

    const panels = chapters.length;
    const ctx = gsap.context(() => {
      gsap.to(railRef.current, {
        xPercent: -100 * (panels - 1) / panels,
        ease: "none",
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: () => `+=${(panels - 1) * 100}%`,
          pin: pinRef.current,
          scrub: 1.35,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, wrapRef);

    refreshCinemaLayout(400);
    return () => ctx.revert();
  }, [reduced, isMobile, chapters.length]);

  return (
    <div
      ref={wrapRef}
      className={`folio-sequence section-breath ${isMobile ? "folio-sequence--native" : ""}`}
      data-section="folio"
      data-atmosphere="editorial"
      style={
        !isMobile && !reduced
          ? { height: `${chapters.length * 100}vh` }
          : undefined
      }
    >
      <div className="editorial-container mb-8 md:mb-10">
        <SectionLabel>Folio</SectionLabel>
        <h2 className="headline-md mt-3 max-w-[20ch]">{title}</h2>
        <p className="meta-label mt-3 text-[var(--ink-faint)]">
          {isMobile
            ? "Swipe through chapters"
            : "Scroll to turn the folio"}
        </p>
      </div>

      <div
        ref={pinRef}
        className="folio-pin"
        {...(isMobile
          ? { "data-lenis-prevent": true }
          : {})}
      >
        <div
          ref={railRef}
          className="folio-rail"
          style={{ width: isMobile ? "100%" : `${chapters.length * 100}%` }}
        >
          {chapters.map((chapter, i) => (
            <article
              key={chapter.id}
              className="folio-chapter relative overflow-hidden"
              style={{ flex: `0 0 ${100 / chapters.length}%` }}
              data-atmosphere={chapter.tone}
            >
              <div className="absolute inset-0 z-0">
                <NarrativeImage
                  src={chapter.image}
                  alt=""
                  variant="folio"
                  revealDelay={0.2 + i * 0.1}
                  enablePan
                  className="h-full min-h-[50vh] md:min-h-full"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[var(--paper)] via-[var(--paper)]/40 to-transparent md:from-[var(--paper)]/90"
                  aria-hidden
                />
              </div>
              <div className="relative z-10 mx-auto w-full max-w-lg pb-8 md:pb-12">
                <SectionLabel className="!text-[var(--ink-muted)]">
                  {chapter.kicker}
                </SectionLabel>
                <h3 className="headline-md mt-4 text-[var(--ink-primary)]">
                  {chapter.title}
                </h3>
                <p className="editorial-body mt-5">{chapter.excerpt}</p>
                <ContinueReading
                  href={`/story/${chapter.slug}`}
                  label="Read chapter"
                  hint={`Part ${i + 1}`}
                  className="mt-8"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
