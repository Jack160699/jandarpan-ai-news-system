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
 * Open Article Reader for Jan Darpan Live.
 *
 * Requirements:
 * 1. OPEN READING CANVAS: Integrated into page layout, no boxy card shell or heavy borders.
 * 2. PREMIUM READABLE TYPOGRAPHY: Large prominent headline, generous paragraph spacing, optimal line height.
 * 3. NO PUBLIC SOURCE LABELS: Remove public source/provider labels from UI while preserving backend provenance.
 * 4. UNIFIED CONTROL SYSTEM: Back, Share, WhatsApp icon buttons share identical dimensions, radius, and weights.
 * 5. RELATED ARTICLES: Horizontal geometry (IMAGE LEFT + CONTENT RIGHT) powered by canonical metadata.
 * 6. FIRST-CLASS LIGHT/DARK CONTRAST: High readability across themes.
 */
export function InPlaceArticleReader({ article }: { article: BroadcastSegment }) {
  const { state, setSelectedArticle } = useBroadcast();
  const { language, queue } = state;

  const [fullContent, setFullContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const headline =
    language === "en"
      ? article.headlineEn || article.headline
      : article.headlineHi || article.headline;
  const summary =
    language === "en"
      ? article.summaryEn || article.summary
      : article.summaryHi || article.summary;
  const rawDistrict =
    language === "en"
      ? article.districtEn || article.district
      : article.districtHi || article.district;
  const category =
    language === "en"
      ? article.categoryLabelEn || article.categoryLabel
      : article.categoryLabelHi || article.categoryLabel;

  const validDistrict =
    rawDistrict && rawDistrict !== "छत्तीसगढ़" && rawDistrict !== "Chhattisgarh"
      ? rawDistrict
      : null;
  const locationTag =
    validDistrict ||
    (category && category !== "छत्तीसगढ़" && category !== "Chhattisgarh" ? category : null) ||
    (language === "hi" ? "राज्य डेस्क" : "State Desk");

  // Fetch full article content from API with language parameter
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!article.slug) {
      setFullContent("");
      setLoading(false);
      return;
    }

    fetch(`/api/story-detail?slug=${encodeURIComponent(article.slug)}&lang=${language}`)
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
  }, [article.slug, language]);

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

  // Split content into clean editorial paragraphs, stripping any trailing public source labels
  const paragraphs = useMemo(() => {
    if (!fullContent) return [];
    return fullContent
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => {
        if (!p || p.length === 0 || p.startsWith("#") || p.startsWith("![")) return false;
        if (/^(?:स्रोत|source|सौजन्य|क्रेडिट|credit|रिपोर्टर|ब्यूरो)\s*:/i.test(p)) return false;
        if (p.includes("जन दर्पण ब्यूरो द्वारा सत्यापित स्थानीय कवरेज")) return false;
        return true;
      })
      .map((p) => p.replace(/^(?:स्रोत|source)\s*:.*$/gmi, "").trim())
      .filter((p) => p.length > 0)
      .slice(0, 15);
  }, [fullContent]);

  // Genuinely related articles (scored by category tags, district, and subject matter)
  const relatedArticles = useMemo(() => {
    const currentId = article.id;
    const currentCategories = article.canonicalCategories || [];
    const currentDistrict = (article.district || article.districtHi || "").toLowerCase();
    const currentWords = (article.headline || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const candidates = queue.filter((s) => !s.isIntro && s.id !== currentId);

    const scored = candidates.map((s) => {
      let score = 0;
      const sCategories = s.canonicalCategories || [];
      const sDistrict = (s.district || s.districtHi || "").toLowerCase();
      const sHeadline = (s.headline || "").toLowerCase();

      // Shared canonical categories
      for (const cat of currentCategories) {
        if (cat !== "all" && sCategories.includes(cat)) {
          score += cat === "chhattisgarh" ? 2 : 5;
        }
      }

      // Shared district (canonical slug or localized name match)
      const slugMatch = article.districtSlug && s.districtSlug && article.districtSlug === s.districtSlug;
      if (
        slugMatch ||
        (currentDistrict &&
        sDistrict &&
        currentDistrict.includes(sDistrict) &&
        !currentDistrict.includes("राज्य"))
      ) {
        score += 4;
      }

      // Keyword overlap
      for (const word of currentWords) {
        if (sHeadline.includes(word)) {
          score += 3;
        }
      }

      // Freshness within 30-day window
      const pubTime = s.publishedAt ? new Date(s.publishedAt).getTime() : 0;
      const ageHours = (Date.now() - pubTime) / 3600000;
      if (ageHours < 48) score += 1;

      return { story: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((x) => x.story);
  }, [queue, article]);

  const handleSelectRelatedArticle = (rel: BroadcastSegment) => {
    setSelectedArticle(rel);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <article className="jd-open-reader" aria-labelledby="jd-reader-heading">
      {/* Sleek Top Navigation Bar - Unified Control System */}
      <nav className="jd-reader-top-nav" aria-label="Article navigation">
        <button
          type="button"
          onClick={() => setSelectedArticle(null)}
          className="jd-control-btn jd-control-btn--back"
          aria-label={language === "hi" ? "लाइव खबरों पर वापस जाएं" : "Back to live queue"}
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
          <span>{language === "hi" ? "वापस जाएं" : "Back"}</span>
        </button>

        <div className="jd-reader-top-nav__actions">
          {/* Share Link Icon */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="jd-control-btn jd-control-btn--icon"
            title={copied ? (language === "hi" ? "लिंक कॉपी हो गया!" : "Copied!") : (language === "hi" ? "लिंक कॉपी करें" : "Copy link")}
            aria-label={language === "hi" ? "लिंक साझा करें" : "Share link"}
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
          </button>

          {/* WhatsApp Share Icon - Unified Design Language */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="jd-control-btn jd-control-btn--icon jd-control-btn--wa"
            title={language === "hi" ? "व्हाट्सएप पर साझा करें" : "Share on WhatsApp"}
            aria-label="WhatsApp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </button>

          {/* Close Icon */}
          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="jd-control-btn jd-control-btn--icon"
            title={language === "hi" ? "बंद करें" : "Close"}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ARTICLE HEADER */}
      <header className="jd-reader-header">
        <div className="jd-reader-meta-row">
          <span className="jd-reader-district-pill">📍 {locationTag}</span>
          {category && <span className="jd-reader-cat-pill">{category}</span>}
          {article.isBreaking && (
            <span className="jd-reader-breaking-pill">
              {language === "hi" ? "ब्रेकिंग" : "BREAKING"}
            </span>
          )}
        </div>

        {/* Large, Prominent Editorial Headline */}
        <h1 id="jd-reader-heading" className="jd-reader-headline">
          {headline}
        </h1>

        {/* Summary Deck / Lead Overview */}
        {summary && (
          <p className="jd-reader-summary">
            {summary}
          </p>
        )}

        {/* Publication Metadata Byline (No public third-party source exposure) */}
        <div className="jd-reader-byline">
          <span className="jd-reader-byline__date">
            {formatFullDate(article.publishedAt, language)}
          </span>
          <span className="jd-reader-byline__dot">•</span>
          <span className="jd-reader-byline__readtime">
            {language === "hi" ? "2 मिनट का वाचन" : "2 min read"}
          </span>
          <span className="jd-reader-byline__dot">•</span>
          <span className="jd-reader-byline__source">
            {language === "hi" ? "जन दर्पण लाइव न्यूज़रूम" : "Jan Darpan Live Newsroom"}
          </span>
        </div>
      </header>

      {/* ARTICLE IMAGE / MEDIA */}
      {imageUrl ? (
        <figure className="jd-reader-media">
          <div className="jd-reader-media__img-wrap">
            <Image
              src={imageUrl}
              alt={headline}
              fill
              sizes="(max-width: 768px) 100vw, 920px"
              className="jd-reader-media__img"
              priority
              unoptimized
              referrerPolicy="no-referrer"
            />
          </div>
          <figcaption className="jd-reader-media__caption">
            {locationTag} • {language === "hi" ? "जन दर्पण डिजिटल कवरेज" : "Jan Darpan Digital Coverage"}
          </figcaption>
        </figure>
      ) : null}

      {/* ARTICLE CONTENT */}
      <section className="jd-reader-content" aria-label="Article text">
        {loading ? (
          <div className="jd-reader-loading">
            <div className="jd-reader-spinner" />
            <span>{language === "hi" ? "विस्तृत खबर लोड हो रही है…" : "Loading story content…"}</span>
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
      </section>

      {/* ARTICLE ACTIONS - Unified Jan Darpan Action Row (Requirement #22) */}
      <section className="jd-reader-actions-section" aria-label="Story actions">
        <div className="jd-reader-actions-bar">
          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="jd-control-btn jd-control-btn--action"
            title={language === "hi" ? "लाइव खबरों पर वापस जाएं" : "Return to live feed"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{language === "hi" ? "वापस लाइव" : "Back to Live"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="jd-control-btn jd-control-btn--action"
            title={copied ? (language === "hi" ? "लिंक कॉपी हो गया!" : "Copied!") : (language === "hi" ? "लिंक कॉपी करें" : "Copy link")}
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            )}
            <span>{copied ? (language === "hi" ? "कॉपी हुआ!" : "Copied!") : (language === "hi" ? "शेयर लिंक" : "Share Link")}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="jd-control-btn jd-control-btn--action jd-control-btn--wa-action"
            title={language === "hi" ? "व्हाट्सएप पर साझा करें" : "Share on WhatsApp"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </button>
        </div>
      </section>

      {/* RELATED ARTICLES - Horizontal Geometry: IMAGE LEFT + CONTENT RIGHT (Requirements #23 & #24) */}
      {relatedArticles.length > 0 && (
        <section className="jd-reader-related-section" aria-label={language === "hi" ? "संबंधित खबरें" : "Related Articles"}>
          <div className="jd-reader-related-head">
            <span className="jd-reader-related-head__dot" aria-hidden="true" />
            <h2 className="jd-reader-related-head__title">
              {language === "hi" ? "संबंधित खबरें" : "Related Stories"}
            </h2>
          </div>

          {/* Exact same geometry as main queue: IMAGE LEFT, CONTENT RIGHT */}
          <div className="jdl-mobile-queue__list jd-reader-related-list">
            {relatedArticles.map((rel) => {
              const relHeadline =
                language === "en"
                  ? rel.headlineEn || rel.headline
                  : rel.headlineHi || rel.headline;
              const relDist =
                language === "en"
                  ? rel.districtEn || rel.district
                  : rel.districtHi || rel.district;
              const validRelDist =
                relDist && relDist !== "छत्तीसगढ़" && relDist !== "Chhattisgarh"
                  ? relDist
                  : null;
              const relCat =
                language === "en"
                  ? rel.categoryLabelEn || rel.categoryLabel
                  : rel.categoryLabelHi || rel.categoryLabel;
              const relLocationTag =
                validRelDist ||
                (relCat && relCat !== "छत्तीसगढ़" && relCat !== "Chhattisgarh" ? relCat : null) ||
                (language === "hi" ? "राज्य डेस्क" : "State Desk");

              return (
                <article
                  key={rel.id}
                  className="jdl-queue-card jdl-queue-card--related"
                  onClick={() => handleSelectRelatedArticle(rel)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const target = e.target as HTMLElement | null;
                      if (target && target.closest("button")) return;
                      e.preventDefault();
                      handleSelectRelatedArticle(rel);
                    }
                  }}
                  aria-label={relHeadline}
                >
                  {/* Left: Thumbnail */}
                  <div
                    className="jdl-queue-card__thumb-wrap"
                    aria-hidden="true"
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
                          color: "rgba(255,255,255,0.72)",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        जन दर्पण
                      </div>
                    )}
                  </div>

                  {/* Right: Content Column */}
                  <div className="jdl-queue-card__body">
                    <div className="jdl-queue-card__meta">
                      <span className="jdl-queue-card__tag">📍 {relLocationTag}</span>
                    </div>

                    <h3
                      className="jdl-queue-card__headline"
                      title={relHeadline}
                    >
                      {relHeadline}
                    </h3>

                    {/* Bottom-right: bold, highlighted 'पढ़ें' button */}
                    <div className="jdl-queue-card__action-row">
                      <span />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRelatedArticle(rel);
                        }}
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
