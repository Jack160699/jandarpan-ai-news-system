"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { ReaderLivePage } from "@/features/reader-ds/live/ReaderLivePage";
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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

  return (
    <div className="jd-auth-gate-container">
      {/* ─── 1. AUTHENTIC JAN DARPAN PRODUCTION EXPERIENCE BACKDROP ─── */}
      {/* Reuses actual production components: ReaderLivePage (Masthead, TV Studio, Queue, Engagement Row) */}
      {/* Moderately blurred (3.2px), visually authentic, zero content leakage, non-interactive */}
      <div
        className={`jd-auth-gate-backdrop ${
          previewPhase === "preview"
            ? "jd-auth-gate-backdrop--preview"
            : "jd-auth-gate-backdrop--modal"
        }`}
        aria-hidden="true"
        tabIndex={-1}
      >
        {feed ? <ReaderLivePage feed={feed} /> : null}
      </div>

      {/* ─── 2. OVERLAY & 5-SECOND PREVIEW / AUTHENTICATION MODAL ────── */}
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
              <div className="jd-auth-banner-controls">
                <div className="jd-auth-banner-lang-switch">
                  <button
                    type="button"
                    onClick={() => setLanguage("hi")}
                    className={`jd-auth-banner-lang-btn ${isHindi ? "jd-auth-banner-lang-btn--active" : ""}`}
                  >
                    हिंदी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`jd-auth-banner-lang-btn ${!isHindi ? "jd-auth-banner-lang-btn--active" : ""}`}
                  >
                    EN
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="jd-auth-banner-theme-btn"
                  aria-label={prefs.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {prefs.theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </button>
              </div>
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
              <div className="jd-auth-modal-emblem" aria-hidden="true">
                {/* Official Jan Darpan Brand Seal */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Crimson background circle */}
                  <circle cx="14" cy="14" r="14" fill="#c8102e" />
                  {/* Gold accent ring */}
                  <circle cx="14" cy="14" r="11.5" fill="none" stroke="#d4a84b" strokeWidth="1" />
                  {/* Devanagari ज letterform */}
                  <text
                    x="14"
                    y="19.5"
                    textAnchor="middle"
                    fontFamily="'Noto Serif Devanagari', serif"
                    fontWeight="700"
                    fontSize="14"
                    fill="#ffffff"
                  >
                    ज
                  </text>
                </svg>
              </div>
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
