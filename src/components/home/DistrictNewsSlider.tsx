"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { MediaImage } from "@/components/media/MediaImage";
import { formatHomeTime } from "@/lib/homepage/format";
import { districtLabelFor } from "@/lib/homepage/district-labels";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

const IMG_DISTRICT_CARD =
  "(max-width: 480px) 44vw, (max-width: 768px) 180px, 180px";

const MIN_LOOP_ITEMS = 6;
const MARQUEE_DURATION_S = 80;

type DistrictNewsSliderProps = {
  articles: HomeArticle[];
  className?: string;
};

type SlideItem = {
  article: HomeArticle;
  district: string;
  key: string;
};

function buildSlides(
  articles: HomeArticle[],
  language: string
): SlideItem[] {
  const base = articles.slice(0, 8).map((article, index) => ({
    article,
    district: districtLabelFor(article, index, language),
    key: article.id,
  }));

  if (base.length === 0) return [];

  const loop: SlideItem[] = [];
  while (loop.length < Math.max(MIN_LOOP_ITEMS, base.length * 2)) {
    for (const item of base) {
      loop.push({
        ...item,
        key: `${item.key}-${loop.length}`,
      });
    }
  }
  return loop;
}

function DistrictSlideCard({
  item,
  listPosition,
}: {
  item: SlideItem;
  listPosition: number;
}) {
  const { article, district } = item;
  const timeLabel = formatHomeTime(article.publishedAt);

  return (
    <TrackedStoryLink
      href={`/story/${article.slug}`}
      slug={article.slug}
      category={article.section}
      region={article.section}
      surface="homepage"
      listPosition={listPosition}
      className="district-slider__card"
    >
      <div className="district-slider__media">
        <MediaImage
          src={article.imageUrl}
          alt=""
          sizes={IMG_DISTRICT_CARD}
          category={article.tags[0] ?? article.section}
          aspect="fill"
          cropAspect="4:5"
          fillParent
          hoverZoom={false}
          cinematic={false}
          subtleScrim={false}
          shadow={false}
        />
        <span className="district-slider__scrim" aria-hidden />
      </div>
      <div className="district-slider__body">
        <span className="district-slider__badge">{district}</span>
        <h3
          className="district-slider__headline hi"
          lang={article.language === "hi" ? "hi" : undefined}
        >
          {article.headline}
        </h3>
        <div className="district-slider__meta">
          <time dateTime={article.publishedAt}>{timeLabel}</time>
          {article.readingTime ? (
            <>
              <span className="district-slider__meta-sep" aria-hidden>
                ·
              </span>
              <span>{article.readingTime}</span>
            </>
          ) : null}
        </div>
      </div>
    </TrackedStoryLink>
  );
}

/**
 * Premium dual-card district showcase — Framer Motion infinite marquee.
 */
export function DistrictNewsSlider({
  articles,
  className = "",
}: DistrictNewsSliderProps) {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  const slides = useMemo(
    () => buildSlides(articles, language),
    [articles, language]
  );

  const onPause = useCallback(() => setPaused(true), []);
  const onResume = useCallback(() => setPaused(false), []);

  if (!slides.length) return null;

  const duplicated = [...slides, ...slides];

  return (
    <section
      className={`district-slider pl-mobile-only${reduceMotion ? " district-slider--static" : ""}${className ? ` ${className}` : ""}`.trim()}
      aria-label="District highlights"
    >
      <span className="district-slider__fade district-slider__fade--left" aria-hidden />
      <span className="district-slider__fade district-slider__fade--right" aria-hidden />

      <div
        className={`district-slider__viewport${paused ? " district-slider__viewport--paused" : ""}`}
        onPointerEnter={onPause}
        onPointerLeave={onResume}
        onPointerDown={onPause}
        onPointerUp={onResume}
        onPointerCancel={onResume}
      >
        {reduceMotion ? (
          <div className="district-slider__track" role="list">
            {duplicated.map((item, index) => (
              <div key={item.key} role="listitem">
                <DistrictSlideCard
                  item={item}
                  listPosition={(index % slides.length) + 1}
                />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            className="district-slider__track district-slider__track--motion"
            role="list"
            animate={paused ? undefined : { x: ["0%", "-50%"] }}
            transition={{
              duration: MARQUEE_DURATION_S,
              ease: "linear",
              repeat: Infinity,
              repeatType: "loop",
            }}
            style={{ willChange: "transform" }}
          >
            {duplicated.map((item, index) => (
              <div key={item.key} role="listitem">
                <DistrictSlideCard
                  item={item}
                  listPosition={(index % slides.length) + 1}
                />
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
