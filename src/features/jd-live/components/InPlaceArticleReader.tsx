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

/**
 * Dedicated Article Reader below Sticky Live TV.
 *
 * Requirements:
 * 1. Shows ONLY the selected article (news queue is hidden).
 * 2. Live TV remains persistent & sticky at top.
 * 3. Compact icon-based controls: Back (←), Share (link), WhatsApp (wa), Close (✕).
 * 4. Proper readable newspaper typography, verified image, full content paragraphs.
 * 5. YouTube-like continuation model: "संबंधित खबरें" (Related Articles) at bottom.
 * 6. Selecting related article updates active reader in place without mixed queue appearing.
 * 7. Back button restores news queue with category & district preserved.
 */
export function InPlaceArticleReader({ article }: { article: BroadcastSegment }) {
  const { state, setSelectedArticle } = useBroadcast();
  const { language, queue } = state;

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

  // Fetch full article content from API
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

  const handleShareWhatsApp = () => {
    const shareText = `${headline}\n\nपूरी खबर जन दर्पण पर पढ़ें:\nhttps://www.jandarpan.news/story/${article.slug || ""}`;
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

  // Split content into clean editorial paragraphs
  const paragraphs = useMemo(() => {
    if (!fullContent) return [];
    return fullContent
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith("#") && !p.startsWith("!["))
      .slice(0, 15);
  }, [fullContent]);

  // Related articles (YouTube-like continuation model)
  const relatedArticles = useMemo(() => {
    const currentId = article.id;
    const cat = (article.section || article.categoryLabel || "").toLowerCase();
    const dist = (article.district || article.districtHi || "").toLowerCase();

    return queue
      .filter((s) => !s.isIntro && s.id !== currentId)
      .filter((s) => {
        const sCat = `${s.section || ""} ${s.categoryLabel || ""}`.toLowerCase();
        const sDist = `${s.district || ""} ${s.districtHi || ""}`.toLowerCase();
        return (cat && sCat.includes(cat)) || (dist && sDist.includes(dist)) || true;
      })
      .slice(0, 4);
  }, [queue, article]);

  const handleSelectRelatedArticle = (rel: BroadcastSegment) => {
    setSelectedArticle(rel);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <article className="jd-dedicated-reader" aria-labelledby="jd-reader-heading">
      {/* Compact Top Action Bar (Requirement #11: Compact icon-based controls) */}
      <div className="jd-reader-topbar">
        {/* Back Button: Returns to Live news queue */}
        <button
          type="button"
          onClick={() => setSelectedArticle(null)}
          className="jd-reader-back-btn"
          aria-label={language === "hi" ? "वापस जाएं" : "Back to news queue"}
          title={language === "hi" ? "वापस जाएं" : "Back"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>{language === "hi" ? "वापस" : "Back"}</span>
        </button>

        {/* Compact Action Icons: Share, WhatsApp, Close */}
        <div className="jd-reader-icon-group">
          {/* Share / Copy Link Icon */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="jd-reader-icon-btn"
            title={copied ? (language === "hi" ? "लिंक कॉपी हो गया!" : "Copied!") : (language === "hi" ? "लिंक कॉपी करें" : "Copy link")}
            aria-label={language === "hi" ? "लिंक साझा करें" : "Share link"}
          >
            {copied ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
          </button>

          {/* WhatsApp Share Icon */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="jd-reader-icon-btn jd-reader-icon-btn--wa"
            title={language === "hi" ? "व्हाट्सएप पर साझा करें" : "Share on WhatsApp"}
            aria-label="WhatsApp"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </button>

          {/* Close Icon: Returns to news queue */}
          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="jd-reader-icon-btn"
            title={language === "hi" ? "बंद करें" : "Close"}
            aria-label="Close"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Article Body */}
      <div className="jd-reader-body">
        {/* District & Category Meta */}
        <div className="jd-reader-meta">
          <span className="jd-reader-tag">📍 {locationTag}</span>
          {category && <span className="jd-reader-cat">{category}</span>}
          {article.isBreaking && (
            <span className="jd-reader-breaking">
              {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 id="jd-reader-heading" className="jd-reader-headline">
          {headline}
        </h1>

        {/* Summary Quote */}
        {summary && (
          <p className="jd-reader-summary">
            {summary}
          </p>
        )}

        {/* Date, Reading time & Bureau metadata */}
        <div className="jd-reader-pub-row">
          <span className="jd-reader-date">
            {formatFullDate(article.publishedAt, language)}
          </span>
          <span className="jd-reader-bullet">•</span>
          <span className="jd-reader-readtime">
            {language === "hi" ? "2 मिनट का वाचन" : "2 min read"}
          </span>
          <span className="jd-reader-bullet">•</span>
          <span className="jd-reader-source">जन दर्पण लाइव ब्यूरो</span>
        </div>

        {/* Verified Editorial Photograph with Caption */}
        {imageUrl ? (
          <figure className="jd-reader-figure">
            <div className="jd-reader-img-wrap">
              <Image
                src={imageUrl}
                alt={headline}
                fill
                sizes="(max-width: 768px) 100vw, 780px"
                className="jd-reader-img"
                priority
                unoptimized
                referrerPolicy="no-referrer"
              />
            </div>
            <figcaption className="jd-reader-caption">
              {locationTag} • जन दर्पण डिजिटल रिपोर्ट
            </figcaption>
          </figure>
        ) : null}

        {/* Full Article Content */}
        <div className="jd-reader-prose">
          {loading ? (
            <div className="jd-reader-loading">
              <div className="jd-reader-spinner" />
              <span>{language === "hi" ? "खबर लोड हो रही है…" : "Loading article…"}</span>
            </div>
          ) : paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <p key={i} className="jd-reader-para">
                {para}
              </p>
            ))
          ) : (
            <>
              {summary && <p className="jd-reader-para">{summary}</p>}
              {article.script && (
                <p className="jd-reader-para">{article.script}</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* YouTube-like Continuation Model: संबंधित खबरें (Related Articles) */}
      {relatedArticles.length > 0 && (
        <section className="jd-reader-related" aria-label={language === "hi" ? "संबंधित खबरें" : "Related Articles"}>
          <div className="jd-reader-related__head">
            <span className="jd-reader-related__dot" aria-hidden="true" />
            <h2 className="jd-reader-related__title">
              {language === "hi" ? "संबंधित खबरें" : "Related Stories"}
            </h2>
          </div>

          <div className="jd-reader-related__list">
            {relatedArticles.map((rel) => {
              const relHeadline =
                language === "hi"
                  ? rel.headlineHi || rel.headline
                  : rel.headline;
              const relDist =
                language === "hi"
                  ? rel.districtHi || rel.district
                  : rel.district;
              const validRelDist =
                relDist && relDist !== "छत्तीसगढ़" && relDist !== "Chhattisgarh"
                  ? relDist
                  : null;
              const relLocationTag =
                validRelDist ||
                (rel.categoryLabel && rel.categoryLabel !== "छत्तीसगढ़" ? rel.categoryLabel : null) ||
                (language === "hi" ? "राज्य डेस्क" : "State Desk");

              return (
                <article key={rel.id} className="jd-queue-card jd-queue-card--related">
                  <div
                    className="jdl-queue-card__thumb-wrap"
                    onClick={() => handleSelectRelatedArticle(rel)}
                    role="button"
                    tabIndex={0}
                    aria-label={relHeadline}
                  >
                    {rel.imageUrl && hasVerifiedRealMedia(rel.imageUrl) ? (
                      <Image
                        src={rel.imageUrl}
                        alt=""
                        fill
                        sizes="84px"
                        className="jdl-mobile-queue__thumb"
                        style={{ objectFit: "cover" }}
                        unoptimized
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="jdl-mobile-queue__thumb-fallback"
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#102038",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        जन दर्पण
                      </div>
                    )}
                  </div>

                  <div className="jdl-queue-card__body">
                    <div className="jdl-queue-card__meta">
                      <span className="jdl-queue-card__tag">📍 {relLocationTag}</span>
                    </div>

                    <h3
                      className="jdl-queue-card__headline"
                      onClick={() => handleSelectRelatedArticle(rel)}
                      title={relHeadline}
                    >
                      {relHeadline}
                    </h3>

                    <div className="jdl-queue-card__action-row">
                      <button
                        type="button"
                        onClick={() => handleSelectRelatedArticle(rel)}
                        className="jdl-queue-card__read-btn"
                        aria-label={`${relHeadline} — ${language === "hi" ? "पढ़ें" : "Read"}`}
                      >
                        <span>{language === "hi" ? "पढ़ें" : "Read"}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
