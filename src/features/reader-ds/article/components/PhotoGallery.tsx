"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArticleImage } from "../../components/ArticleImage";
import { Tag } from "../../components/primitives";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";

type PhotoGalleryProps = {
  images: Array<{ src?: string | null; caption?: string | null; alt: string }>;
  kicker?: string;
  backHref?: string;
};

/** B14 / D06 — photo story with desk thumb rail; phone keeps dots. */
export function PhotoGallery({ images, kicker, backHref = "/" }: PhotoGalleryProps) {
  const { t } = useJdDsT();
  const [index, setIndex] = useState(0);
  const safe = images.length ? images : [{ src: null, caption: null, alt: "फ़ोटो" }];
  const total = safe.length;
  const current = safe[Math.min(index, total - 1)];

  const go = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => ((i + 1) % total + total) % total);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => ((i - 1) % total + total) % total);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  return (
    <div className="jd-ds jd-photo-story" data-testid="jd-reader-ds" data-theme="dark">
      <div className="jd-photo-story__chrome">
        <Link href={backHref} aria-label={t("masthead.backAria")} className="jd-photo-story__icon">
          <JdIcon name="arrowL" size={22} stroke={2} color="#e7edf6" />
        </Link>
        <span className="jd-ui jd-photo-story__title">फ़ोटो स्टोरी</span>
        <button type="button" aria-label="शेयर" data-action="share" className="jd-photo-story__icon">
          <JdIcon name="share" size={20} stroke={1.8} color="#e7edf6" />
        </button>
      </div>

      <div className="jd-photo-story__body">
        <div className="jd-photo-story__stage">
          <button
            type="button"
            className="jd-photo-story__nav jd-photo-story__nav--prev"
            aria-label={t("photo.prev")}
            onClick={() => go(index - 1)}
          >
            <JdIcon name="arrowL" size={20} stroke={2} color="#e7edf6" />
          </button>

          <button
            type="button"
            className="jd-photo-story__primary"
            onClick={() => go(index + 1)}
            aria-label={t("photo.next")}
          >
            <ArticleImage
              src={current.src}
              alt={current.alt}
              ratio="photo"
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 70vw, 900px"
              tone="festival"
              priority={index === 0}
            />
            <div className="jd-photo-story__dots" aria-hidden>
              {safe.slice(0, 5).map((_, i) => (
                <span key={i} className={i === index % Math.min(5, total) ? "is-active" : undefined} />
              ))}
            </div>
          </button>

          <button
            type="button"
            className="jd-photo-story__nav jd-photo-story__nav--next"
            aria-label={t("photo.next")}
            onClick={() => go(index + 1)}
          >
            <JdIcon name="chevR" size={20} stroke={2} color="#e7edf6" />
          </button>

          <div className="jd-photo-story__caption">
            <div className="jd-photo-story__caption-row">
              {kicker ? <Tag color="var(--jd-gold)">{kicker}</Tag> : <span />}
              <span className="jd-ui jd-photo-story__count">
                {t("photo.count", { n: index + 1, total })}
              </span>
            </div>
            <p className="jd-serif">{current.caption || current.alt}</p>
          </div>
        </div>

        <aside
          className="jd-photo-story__thumbs"
          data-testid="jd-photo-thumbnail-rail"
          aria-label={t("photo.thumbs")}
        >
          <div className="jd-photo-story__thumbs-grid">
            {safe.map((img, i) => (
              <button
                key={`${img.alt}-${i}`}
                type="button"
                className={`jd-photo-story__thumb${i === index ? " is-active" : ""}`}
                aria-current={i === index ? "true" : undefined}
                aria-label={`${i + 1}: ${img.alt}`}
                onClick={() => setIndex(i)}
              >
                <ArticleImage
                  src={img.src}
                  alt=""
                  ratio="square"
                  sizes="140px"
                  tone="festival"
                />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
