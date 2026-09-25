"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import type { BroadcastSegment } from "../types";
import { useBroadcast } from "../BroadcastContext";
import { hasVerifiedRealMedia } from "@/lib/news/images/validate";

function formatFullDate(dateStr?: string, lang: "hi" | "en" = "hi"): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function InPlaceArticleReader({ article }: { article: BroadcastSegment }) {
  const { state, setSelectedArticle, interruptBreaking, setPlaying, setMuted } = useBroadcast();
  const { language, currentSegment } = state;

  const [fullContent, setFullContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const headline =
    language === "hi"
      ? article.headlineHi || article.headline
      : article.headline;
  const summary =
    language === "hi"
      ? article.summaryHi || article.summary
      : article.summary;
  const rawDistrict =
    language === "hi"
      ? article.districtHi || article.district
      : article.district;
  const category =
    language === "hi"
      ? article.categoryLabelHi || article.categoryLabel
      : article.categoryLabel;

  const validDistrict =
    rawDistrict && rawDistrict !== "छत्तीसगढ़" && rawDistrict !== "Chhattisgarh"
      ? rawDistrict
      : null;
  const locationTag =
    validDistrict ||
    (category && category !== "छत्तीसगढ़" && category !== "Chhattisgarh" ? category : null) ||
    (language === "hi" ? "राज्य डेस्क" : "State Desk");

  // Fetch full article content if available
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!article.slug) {
      setFullContent("");
      setLoading(false);
      return;
    }

    fetch(`/api/story-detail?slug=${encodeURIComponent(article.slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          const content = (data.content || "").trim();
          setFullContent(content);
        }
      })
      .catch((err) => {
        console.warn("[InPlaceArticleReader] failed to fetch details:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [article.slug]);

  // Clean image URL
  const imageUrl = useMemo(() => {
    if (!article.imageUrl) return "";
    let s = article.imageUrl.trim();
    if (s.startsWith("http://")) s = s.replace(/^http:\/\//i, "https://");
    return hasVerifiedRealMedia(s) ? s : "";
  }, [article.imageUrl]);

  const isPlayingOnTv = currentSegment?.id === article.id;

  const handlePlayOnTv = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("jdl_audio_unlocked", "1");
        if ("speechSynthesis" in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch {}

    interruptBreaking(article);
    setPlaying(true);
    setMuted(false);

    // Scroll up to TV
    if (typeof window !== "undefined") {
      const tvEl = document.querySelector(".jdl-tv");
      if (tvEl) {
        tvEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  const handleShareWhatsApp = () => {
    const shareText = `${headline}\n\nपूरी खबर जन दर्पण लाइव पर पढ़ें:\nhttps://www.jandarpan.news/story/${article.slug || ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/story/${article.slug}` : "";
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Split content into clean paragraphs
  const paragraphs = useMemo(() => {
    if (!fullContent) return [];
    return fullContent
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith("#") && !p.startsWith("!["))
      .slice(0, 15);
  }, [fullContent]);

  return (
    <article className="jd-inplace-reader" aria-labelledby="jd-reader-heading">
      {/* Top action bar */}
      <div className="jd-inplace-reader__topbar">
        <button
          type="button"
          onClick={() => {
            setSelectedArticle(null);
            // Scroll back up to queue header
            const queueEl = document.querySelector(".jdl-mobile-queue__header");
            if (queueEl) queueEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
          className="jd-inplace-reader__back-btn"
          aria-label={language === "hi" ? "खबरों की सूची पर वापस जाएँ" : "Back to stories"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{language === "hi" ? "खबरों की सूची पर वापस जाएँ" : "Back to stories list"}</span>
        </button>

        <div className="jd-inplace-reader__actions">
          {!isPlayingOnTv ? (
            <button
              type="button"
              onClick={handlePlayOnTv}
              className="jd-inplace-reader__tv-btn"
              title={language === "hi" ? "इसे TV पर चलाएं" : "Play on TV"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 4.5l14 7.5-14 7.5v-15z" />
              </svg>
              <span>{language === "hi" ? "TV पर देखें" : "Watch on TV"}</span>
            </button>
          ) : (
            <span className="jd-inplace-reader__tv-status">
              <span className="jdl-mobile-queue__active-dot" aria-hidden="true" />
              {language === "hi" ? "TV पर प्रसारित हो रहा है" : "Broadcasting on TV"}
            </span>
          )}

          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="jd-inplace-reader__close-btn"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="jd-inplace-reader__content">
        {/* Meta badges */}
        <div className="jd-inplace-reader__meta">
          <span className="jd-inplace-reader__tag">📍 {locationTag}</span>
          {category && <span className="jd-inplace-reader__cat">{category}</span>}
          {article.isBreaking && (
            <span className="jd-inplace-reader__breaking">
              {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 id="jd-reader-heading" className="jd-inplace-reader__headline">
          {headline}
        </h1>

        {/* Subheading / Summary */}
        {summary && (
          <p className="jd-inplace-reader__summary">
            {summary}
          </p>
        )}

        {/* Date & Read time */}
        <div className="jd-inplace-reader__pub-row">
          <span className="jd-inplace-reader__date">
            {formatFullDate(article.publishedAt, language)}
          </span>
          <span className="jd-inplace-reader__bullet">•</span>
          <span className="jd-inplace-reader__readtime">
            {language === "hi" ? "2 मिनट का वाचन" : "2 min read"}
          </span>
          <span className="jd-inplace-reader__bullet">•</span>
          <span className="jd-inplace-reader__source">जन दर्पण लाइव ब्यूरो</span>
        </div>

        {/* Hero image with strict aspect ratio and caption */}
        {imageUrl ? (
          <figure className="jd-inplace-reader__figure">
            <div className="jd-inplace-reader__img-wrap">
              <Image
                src={imageUrl}
                alt={headline}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="jd-inplace-reader__img"
                style={{ objectFit: "cover" }}
                priority
                unoptimized
                referrerPolicy="no-referrer"
              />
            </div>
            <figcaption className="jd-inplace-reader__caption">
              {locationTag} • जन दर्पण डिजिटल रिपोर्ट
            </figcaption>
          </figure>
        ) : (
          <div className="jd-inplace-reader__no-image">
            <span>जन दर्पण निष्पक्ष व त्वरित समाचार</span>
          </div>
        )}

        {/* Article Body */}
        <div className="jd-inplace-reader__body">
          {loading ? (
            <div className="jd-inplace-reader__skeleton">
              <div className="jd-skeleton-line" style={{ width: "95%" }} />
              <div className="jd-skeleton-line" style={{ width: "90%" }} />
              <div className="jd-skeleton-line" style={{ width: "85%" }} />
              <div className="jd-skeleton-line" style={{ width: "92%" }} />
            </div>
          ) : paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <p key={i} className="jd-inplace-reader__para">
                {para}
              </p>
            ))
          ) : (
            <>
              {summary && <p className="jd-inplace-reader__para">{summary}</p>}
              {article.script && (
                <p className="jd-inplace-reader__para">
                  {article.script}
                </p>
              )}
            </>
          )}
        </div>

        {/* Bottom Bar: Share & Actions */}
        <div className="jd-inplace-reader__footer">
          <div className="jd-inplace-reader__share-group">
            <span className="jd-inplace-reader__share-label">
              {language === "hi" ? "खबर साझा करें:" : "Share:"}
            </span>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="jd-inplace-reader__share-btn jd-inplace-reader__share-btn--wa"
              aria-label="WhatsApp"
            >
              <span>WhatsApp पर साझा करें</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="jd-inplace-reader__share-btn"
              aria-label="Copy link"
            >
              <span>{copied ? (language === "hi" ? "लिंक कॉपी हो गया!" : "Copied!") : (language === "hi" ? "लिंक कॉपी करें" : "Copy Link")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedArticle(null);
              const queueEl = document.querySelector(".jdl-mobile-queue__header");
              if (queueEl) queueEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className="jd-inplace-reader__return-btn"
          >
            {language === "hi" ? "वापस खबरों की सूची पर जाएँ ↑" : "Back to top of news list ↑"}
          </button>
        </div>
      </div>
    </article>
  );
}
