"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import type { RegionalSectionBlock } from "@/lib/homepage/types";

type DeepDiveSectionsProps = {
  streams: RegionalSectionBlock[];
};

const INITIAL_SECTIONS = 3;
const LOAD_STEP = 2;

export function DeepDiveSections({ streams }: DeepDiveSectionsProps) {
  const { language } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(INITIAL_SECTIONS);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const usableStreams = streams.filter((stream) => stream.articles.length > 0);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= usableStreams.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + LOAD_STEP, usableStreams.length));
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [usableStreams.length, visibleCount]);

  if (!usableStreams.length) return null;

  return (
    <div className="atlas-deep-dive" aria-label="More news sections">
      {usableStreams.slice(0, visibleCount).map((stream, streamIndex) => {
        const [lead, ...more] = stream.articles.slice(0, 5);
        if (!lead) return null;
        const sectionDomId = `topic-${stream.id}-${streamIndex}`;

        return (
          <section
            className="atlas-topic"
            key={`${stream.id}-${streamIndex}`}
            aria-labelledby={sectionDomId}
          >
            <div className="atlas-topic__header">
              <h2 id={sectionDomId} className="atlas-topic__title">
                {pickBilingualLabel(language, stream.label, stream.labelHi)}
              </h2>
              <Link href={`/category/${stream.id}`} className="atlas-topic__more">
                {pickBilingualLabel(language, "More", "और भी")}
                <ArrowRight size={15} aria-hidden />
              </Link>
            </div>

            <Link href={`/story/${lead.slug}`} className="atlas-topic__lead">
              <div className="atlas-topic__lead-media">
                <JdsCardImage
                  src={lead.imageUrl || lead.ogImageUrl}
                  alt={lead.headline}
                  category={lead.categoryLabel || lead.section}
                  cropAspect="16:9"
                  sizes="(max-width: 767px) 100vw, 360px"
                />
              </div>
              <h3>{lead.headline}</h3>
              {lead.summary ? <p>{lead.summary}</p> : null}
            </Link>

            {more.length ? (
              <div className="atlas-topic__list" role="list">
                {more.map((article) => (
                  <Link
                    href={`/story/${article.slug}`}
                    className="atlas-topic__row"
                    key={article.id}
                    role="listitem"
                  >
                    <span>{article.headline}</span>
                    <div className="atlas-topic__thumb">
                      <JdsCardImage
                        src={article.imageUrl || article.ogImageUrl}
                        alt=""
                        category={article.categoryLabel || article.section}
                        cropAspect="4:3"
                        sizes="88px"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}

      {visibleCount < usableStreams.length ? (
        <div ref={sentinelRef} className="atlas-deep-dive__sentinel" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}
