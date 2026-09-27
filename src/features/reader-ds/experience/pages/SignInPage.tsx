"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import "@/features/reader-ds/styles/auth-gate.css";

const CONSENT_VERSION = "2026-09-v1";

/* ─── CLEAN PROFESSIONAL SVG ICONS (NO DECORATIVE EMOJIS) ───────────── */

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" focusable="false" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v8.7h11.8c-.5 2.8-2.1 5.2-4.5 6.8v5.6h7.3c4.3-3.9 6.5-9.7 6.5-16.5z"
      />
      <path
        fill="#34A853"
        d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.3-5.6c-2 1.4-4.6 2.2-7.6 2.2-5.9 0-10.8-4-12.6-9.3H3.9v5.8C7.6 41.1 15.2 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.4 27.8c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4V13.2H3.9C2.1 16.7 1 20.2 1 23.4c0 3.2 1.1 6.7 2.9 10.2l7.5-5.8z"
      />
      <path
        fill="#EA4335"
        d="M24 10.9c3.3 0 6.3 1.1 8.6 3.4l6.4-6.4C35.2 4.1 30.1 2 24 2 15.2 2 7.6 6.9 3.9 13.2l7.5 5.8C13.2 14.9 18.1 10.9 24 10.9z"
      />
    </svg>
  );
}

function TvBroadcastIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}

function DistrictMapPinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function VerifiedShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function GlobeLanguageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#dc2626" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.275-.1-.476-.15-.676.15-.2.301-.777.978-.952 1.179-.176.2-.351.226-.652.075s-1.272-.469-2.423-1.496c-.896-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.613.136-.135.301-.351.451-.527.15-.175.2-.301.301-.501.1-.2.05-.376-.025-.526-.075-.15-.676-1.63-.927-2.232-.244-.588-.493-.508-.676-.518l-.577-.01c-.2 0-.526.075-.802.376s-1.053 1.028-1.053 2.508 1.078 2.91 1.229 3.111c.15.2 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.722.23 1.379.197 1.898.12.578-.087 1.78-.727 2.03-1.43.25-.702.25-1.304.175-1.43-.075-.125-.276-.2-.577-.35zM12.04 2C6.516 2 2.028 6.488 2.028 12.012c0 1.954.56 3.782 1.53 5.334L2 22l4.823-1.503c1.488.887 3.224 1.39 5.217 1.39 5.524 0 10.012-4.488 10.012-10.012C22.052 6.488 17.564 2 12.04 2z" />
    </svg>
  );
}

function BookReadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

type SignInPageProps = {
  feed?: GeneratedHomepageFeed | null;
};

export function SignInPage({ feed }: SignInPageProps) {
  const { language, setLanguage } = useLanguage();
  const { prefs, toggleTheme } = useReaderPreferences();
  const { signInWithGoogle, isLoggedIn } = useReaderAccount();
  const configured = isSupabaseConfigured();

  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);
  
  // 5-Second Visual Product Preview state
  const [previewRemaining, setPreviewRemaining] = useState(5);
  const [previewPhase, setPreviewPhase] = useState<"preview" | "modal">("preview");
  const [policyModal, setPolicyModal] = useState<"terms" | "privacy" | null>(null);

  const isHindi = language === "hi";

  // Redirect if session is already active
  useEffect(() => {
    if (isLoggedIn && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      window.location.href = next;
    }
  }, [isLoggedIn]);

  // Phase 1: 5-Second Visual Product Preview Countdown
  useEffect(() => {
    if (previewPhase === "modal") return;

    const timer = setInterval(() => {
      setPreviewRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPreviewPhase("modal");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [previewPhase]);

  // Consent checkbox toggle
  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setConsentChecked(checked);
    if (checked) {
      setShowConsentWarning(false);
    }
  };

  // Skip preview directly into modal
  const handleSkipPreview = () => {
    setPreviewRemaining(0);
    setPreviewPhase("modal");
  };

  // Google Sign-In click
  const onGoogle = async () => {
    if (!consentChecked) {
      setShowConsentWarning(true);
      return;
    }
    setBusy(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("jd_consent_version", CONSENT_VERSION);
        localStorage.setItem("jd_consent_timestamp", new Date().toISOString());
      }
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const next = params?.get("next");
      await signInWithGoogle(next || "/");
    } catch {
      setBusy(false);
    }
  };

  // Format sample news items if feed has items or fallback to authentic Chhattisgarh news
  const breakingNewsText = feed?.breakingTicker?.[0]?.headline || (
    isHindi
      ? "रायपुर-दुर्ग नेशनल हाईवे पर भारी जलभराव से यातायात प्रभावित, प्रशासन ने जारी किया अलर्ट..."
      : "Heavy waterlogging disrupts traffic on Raipur-Durg Highway, administration issues alert..."
  );

  const newsItems = feed?.trending?.length
    ? feed.trending.slice(0, 4).map((art, idx) => ({
        tag: `${art.categoryLabel || (isHindi ? "राज्य" : "State")} • ${art.readingTime || "2 min"}`,
        headline: art.headline,
        likes: idx === 0 ? 2 : 0,
        comments: idx === 0 ? 2 : 0,
        views: idx === 1 || idx === 3 ? 2 : 0,
        img: art.imageUrl || "/images/anchor-fallback.jpg"
      }))
    : [
        {
          tag: isHindi ? "रायपुर • 13 घंटे पहले" : "Raipur • 13h ago",
          headline: isHindi
            ? "राजधानी रायपुर में स्मार्ट सिटी प्रोजेक्ट्स के तहत 12 नए जंक्शंस पर मॉडर्न ट्रैफिक सिस्टम शुरू"
            : "Smart City Projects roll out modern traffic surveillance across 12 major Raipur junctions",
          likes: 2,
          comments: 2,
          views: 0,
          img: "/images/anchor-fallback.jpg"
        },
        {
          tag: isHindi ? "बिलासपुर • 1 दिन पहले" : "Bilaspur • 1d ago",
          headline: isHindi
            ? "बिलासपुर रेल मंडल में 4 नई मेमू ट्रेनों के संचालन की तैयारी, दैनिक यात्रियों को बड़ी राहत"
            : "Bilaspur railway division readies 4 new MEMU routes, offering relief to daily passengers",
          likes: 0,
          comments: 0,
          views: 2,
          img: "/images/anchor-fallback.jpg"
        },
        {
          tag: isHindi ? "बस्तर • 1 दिन पहले" : "Bastar • 1d ago",
          headline: isHindi
            ? "चित्रकोट और तीरथगढ़ जलप्रपात देखने उमड़े सैलानी, पर्यटन विभाग ने तैनात किए लाइफ गार्ड्स"
            : "Chitrakote and Tirathgarh waterfalls see surge in visitors, tourism dept deploys safety team",
          likes: 0,
          comments: 0,
          views: 0,
          img: "/images/anchor-fallback.jpg"
        },
        {
          tag: isHindi ? "दुर्ग • 2 दिन पहले" : "Durg • 2d ago",
          headline: isHindi
            ? "भिलाई इस्पात संयंत्र में ग्रीन स्टील उत्पादन के लिए नए सौर ऊर्जा प्रोजेक्ट का शुभारंभ"
            : "Bhilai Steel Plant initiates landmark solar integration project for green manufacturing",
          likes: 0,
          comments: 0,
          views: 2,
          img: "/images/anchor-fallback.jpg"
        },
      ];

  return (
    <div className="jd-auth-gate-container">
      {/* ─── 1. TOP HEADER (BRAND + DISTRICT + LANGUAGE + THEME) ────── */}
      <header className="jd-auth-header">
        <div className="jd-auth-header-left">
          <div className="jd-auth-brand-logo">
            <div className="jd-auth-brand-circle">ज</div>
            <span className="jd-auth-brand-text">
              {isHindi ? "जन दर्पण" : "JAN DARPAN"}
            </span>
          </div>
          <span className="jd-auth-district-badge">
            {isHindi ? "रायपुर ▾" : "Raipur ▾"}
          </span>
        </div>

        <div className="jd-auth-header-right">
          {/* Language Switcher */}
          <div className="jd-auth-lang-switch">
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className={`jd-auth-lang-btn ${isHindi ? "jd-auth-lang-btn--active" : ""}`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`jd-auth-lang-btn ${!isHindi ? "jd-auth-lang-btn--active" : ""}`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="jd-auth-theme-btn"
            aria-label={prefs.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {prefs.theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* ─── 2. AUTHENTIC JAN DARPAN NEWSROOM BACKDROP ──────────────── */}
      {/* Moderately blurred (3.2px), fully recognizable layout, unreadable body text */}
      <div
        className={`jd-auth-gate-backdrop ${
          previewPhase === "preview"
            ? "jd-auth-gate-backdrop--preview"
            : "jd-auth-gate-backdrop--modal"
        }`}
        aria-hidden="true"
        tabIndex={-1}
      >
        <div className="jd-auth-newsroom-shell">
          {/* Category Filter Strip */}
          <div className="jd-auth-categories-strip">
            {[
              isHindi ? "सभी" : "All",
              isHindi ? "राज्य" : "State",
              isHindi ? "राजनीति" : "Politics",
              isHindi ? "विकास" : "Development",
              isHindi ? "अपराध" : "Crime",
              isHindi ? "बस्तर" : "Bastar",
              isHindi ? "सरगुजा" : "Surguja",
              isHindi ? "खेल" : "Sports",
            ].map((cat, idx) => (
              <span
                key={idx}
                className={`jd-auth-category-pill ${idx === 0 ? "jd-auth-category-pill--active" : ""}`}
              >
                {cat}
              </span>
            ))}
          </div>

          <div className="jd-auth-newsroom-grid">
            {/* Left: TV Studio Live Anchor Desk */}
            <div className="jd-auth-tv-card">
              <div
                className="jd-auth-tv-video-mock"
                style={{
                  backgroundImage: "url('/images/anchor-fallback.jpg')",
                }}
              />
              <div className="jd-auth-tv-top-bar">
                <div className="jd-auth-live-pill">
                  <span className="jd-auth-live-indicator-dot" />
                  <span>LIVE • {isHindi ? "रायपुर (छत्तीसगढ़)" : "Raipur (CG)"}</span>
                </div>
                <div className="jd-auth-audio-pill">
                  <VolumeIcon />
                  <span>{isHindi ? "आवाज़" : "Audio"}</span>
                </div>
              </div>
              <div className="jd-auth-breaking-ticker">
                <span className="jd-auth-ticker-badge">
                  {isHindi ? "मुख्य खबर" : "BREAKING"}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {breakingNewsText}
                </span>
              </div>
            </div>

            {/* Right: Live Editorial Queue Cards */}
            <div className="jd-auth-queue-column">
              {newsItems.map((item, idx) => (
                <div key={idx} className="jd-auth-news-card">
                  <div
                    className="jd-auth-card-thumb"
                    style={{ backgroundImage: `url(${item.img})` }}
                  />
                  <div className="jd-auth-card-body">
                    <span className="jd-auth-card-meta">{item.tag}</span>
                    <div className="jd-auth-card-title-mock" />
                    <div className="jd-auth-card-title-mock jd-auth-card-title-mock--short" />
                    {/* Exactly 5-Section Engagement Row */}
                    <div className="jd-auth-card-engagement">
                      <span className="jd-auth-engagement-item">
                        <HeartIcon /> {item.likes}
                      </span>
                      <span className="jd-auth-engagement-item">
                        <MessageIcon /> {item.comments}
                      </span>
                      <span className="jd-auth-engagement-item">
                        <EyeIcon /> {item.views}
                      </span>
                      <span className="jd-auth-engagement-item">
                        <WhatsAppIcon />
                      </span>
                      <span className="jd-auth-read-badge">
                        <BookReadIcon />
                        <span>{isHindi ? "पढ़ें" : "Read"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. OVERLAY & 5-SECOND PREVIEW / AUTHENTICATION MODAL ────── */}
      <div
        className={`jd-auth-scrim ${
          previewPhase === "preview" ? "jd-auth-scrim--preview" : "jd-auth-scrim--modal"
        }`}
      >
        {/* Top Status Banner (0-5s Countdown & Locked Status) */}
        <div
          className={`jd-auth-status-banner ${
            previewPhase === "preview"
              ? "jd-auth-status-banner--preview"
              : "jd-auth-status-banner--locked"
          }`}
        >
          <div className="jd-auth-banner-left">
            <span className="jd-auth-banner-dot" />
            <span className="jd-auth-banner-text">
              {previewPhase === "preview"
                ? isHindi
                  ? "जन दर्पण लाइव न्यूज़रूम पूर्वावलोकन"
                  : "Jan Darpan Live Newsroom Preview"
                : isHindi
                ? "लाइव न्यूज़रूम सुरक्षा गेट • पूर्ण अनुभव अनलॉक करें"
                : "Live Newsroom Secure Gate • Unlock Full Access"}
            </span>
          </div>

          <div className="jd-auth-banner-right">
            {previewPhase === "preview" ? (
              <>
                <span className="jd-auth-banner-timer-badge">
                  {previewRemaining}s
                </span>
                <button
                  type="button"
                  onClick={handleSkipPreview}
                  className="jd-auth-skip-btn"
                >
                  {isHindi ? "साइन इन ➔" : "Sign In ➔"}
                </button>
              </>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#c8102e" }}>
                {isHindi ? "सुरक्षित लॉगिन" : "Secure Gate"}
              </span>
            )}
          </div>
        </div>

        {/* ─── 4. CENTERED PREMIUM AUTHENTICATION MODAL ─────────────── */}
        {/* Hidden during 0-5s preview; smoothly animates into center after preview */}
        <div
          className={`jd-auth-modal-wrapper ${
            previewPhase === "preview"
              ? "jd-auth-modal-wrapper--hidden"
              : "jd-auth-modal-wrapper--visible"
          }`}
        >
          <div
            className="jd-auth-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            {/* Header Branding */}
            <div className="jd-auth-modal-brand">
              <div className="jd-auth-modal-emblem" aria-hidden="true">ज</div>
              <span className="jd-auth-modal-title-text">
                {isHindi ? "जन दर्पण" : "Jan Darpan"}
              </span>
            </div>

            {/* Tagline & Subtitle */}
            <h1 id="auth-modal-title" className="jd-auth-tagline">
              {isHindi ? "छत्तीसगढ़ की खबरें, सबसे पहले।" : "Chhattisgarh news, first."}
            </h1>

            <p className="jd-auth-subtitle">
              {isHindi
                ? "लाइव खबरें देखने के लिए Google से एक टैप में प्रवेश करें।"
                : "Sign in with Google to enter the live news experience."}
            </p>

            {/* Value Highlights (4 Clean SVG Pills — Strictly Zero Emojis) */}
            <div className="jd-auth-fomo-grid">
              <div className="jd-auth-fomo-pill">
                <span className="jd-auth-fomo-icon">
                  <TvBroadcastIcon />
                </span>
                <span>{isHindi ? "लाइव टीवी प्रसारण" : "Live TV Broadcast"}</span>
              </div>

              <div className="jd-auth-fomo-pill">
                <span className="jd-auth-fomo-icon">
                  <DistrictMapPinIcon />
                </span>
                <span>{isHindi ? "33 ज़िले स्थानीय कवरेज" : "33 Districts Coverage"}</span>
              </div>

              <div className="jd-auth-fomo-pill">
                <span className="jd-auth-fomo-icon">
                  <VerifiedShieldIcon />
                </span>
                <span>{isHindi ? "100% सत्यापित रिपोर्टिंग" : "100% Verified News"}</span>
              </div>

              <div className="jd-auth-fomo-pill">
                <span className="jd-auth-fomo-icon">
                  <GlobeLanguageIcon />
                </span>
                <span>{isHindi ? "द्विभाषी (हिंदी / EN)" : "Bilingual (Hindi / EN)"}</span>
              </div>
            </div>

            {/* Explicit Terms & Legal Consent Checkbox */}
            <div
              className={`jd-auth-consent-box ${
                showConsentWarning && !consentChecked ? "jd-auth-consent-box--warning" : ""
              }`}
            >
              <label className="jd-auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={handleConsentChange}
                  className="jd-auth-checkbox-input"
                  id="jd-terms-consent"
                />
                <span>
                  {isHindi ? (
                    <>
                      मैं{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPolicyModal("terms");
                        }}
                        className="jd-auth-legal-link"
                      >
                        Terms & Conditions
                      </button>{" "}
                      और{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPolicyModal("privacy");
                        }}
                        className="jd-auth-legal-link"
                      >
                        Privacy Policy
                      </button>{" "}
                      से सहमत हूँ।
                    </>
                  ) : (
                    <>
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPolicyModal("terms");
                        }}
                        className="jd-auth-legal-link"
                      >
                        Terms & Conditions
                      </button>{" "}
                      and{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPolicyModal("privacy");
                        }}
                        className="jd-auth-legal-link"
                      >
                        Privacy Policy
                      </button>
                      .
                    </>
                  )}
                </span>
              </label>

              <p className="jd-auth-consent-subtext">
                {isHindi
                  ? "साइन इन करके आप हमारे सामुदायिक दिशानिर्देशों और टिप्पणी नियमों से सहमति व्यक्त करते हैं।"
                  : "By signing in, you agree to our Community Guidelines and commenting rules."}
              </p>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={onGoogle}
              disabled={!consentChecked || busy}
              className="jd-auth-google-btn"
              id="jd-google-signin-btn"
            >
              <GoogleGlyph />
              <span>
                {busy
                  ? isHindi
                    ? "प्रमाणित किया जा रहा है..."
                    : "Authenticating..."
                  : isHindi
                  ? "Google के साथ जारी रखें"
                  : "Continue with Google"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 5. IN-PLACE LEGAL POLICY MODAL DIALOG ──────────────────── */}
      {policyModal && (
        <div
          className="jd-auth-policy-dialog-scrim"
          onClick={() => setPolicyModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="jd-auth-policy-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jd-auth-policy-dialog-header">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {policyModal === "terms"
                  ? isHindi
                    ? "नियम एवं शर्तें (Terms & Conditions)"
                    : "Terms & Conditions"
                  : isHindi
                  ? "गोपनीयता नीति (Privacy Policy)"
                  : "Privacy Policy"}
              </h2>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="jd-auth-policy-close-btn"
              >
                {isHindi ? "बंद करें" : "Close"}
              </button>
            </div>

            <div className="jd-auth-policy-dialog-content">
              {policyModal === "terms" ? (
                <>
                  <p>
                    <strong>1. Jan Darpan सेवा का उपयोग:</strong> Jan Darpan पर उपलब्ध सभी समाचार, लाइव टीवी प्रसारण और डिजिटल सामग्री केवल व्यक्तिगत एवं गैर-व्यावसायिक उपयोग के लिए है।
                  </p>
                  <p>
                    <strong>2. उपयोगकर्ता आचरण और टिप्पणियां:</strong> मंच पर अभद्र, भ्रामक, घृणास्पद अथवा कानून विरोधी टिप्पणी करना सख्त वर्जित है। Jan Darpan संपादकीय टीम को किसी भी टिप्पणी को हटाने या खाता निलंबित करने का पूर्ण अधिकार है।
                  </p>
                  <p>
                    <strong>3. बौद्धिक संपदा:</strong> Jan Darpan का लोगो, वीडियो, पाठ्य सामग्री एवं डिज़ाइन कॉपीराइट कानून के तहत संरक्षित हैं।
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <Link
                      href="/terms"
                      target="_blank"
                      style={{ color: "#c8102e", fontWeight: 700 }}
                    >
                      पूर्ण नियम एवं शर्तें अलग पृष्ठ पर पढ़ें ↗
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. डेटा संग्रहण:</strong> Jan Darpan केवल खाता प्रमाणीकरण, प्राथमिकताओं के प्रबंधन (ज़िला, भाषा) और सेवा सुधार हेतु आवश्यक न्यूनतम जानकारी संग्रहीत करता है।
                  </p>
                  <p>
                    <strong>2. तृतीय-पक्ष प्रमाणीकरण:</strong> हम सुरक्षित Google OAuth का उपयोग करते हैं और आपका पासवर्ड कभी भी संग्रहीत नहीं करते हैं।
                  </p>
                  <p>
                    <strong>3. कुकीज़ एवं एनालिटिक्स:</strong> पढ़ने के अनुभव को अनुकूलित करने के लिए प्राथमिकताओं को सुरक्षित कुकीज़ में सहेजा जाता है।
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <Link
                      href="/privacy"
                      target="_blank"
                      style={{ color: "#c8102e", fontWeight: 700 }}
                    >
                      पूर्ण गोपनीयता नीति अलग पृष्ठ पर पढ़ें ↗
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
