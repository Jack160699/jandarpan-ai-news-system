"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useJdDsT } from "@/features/reader-ds/i18n";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "@/features/reader-ds/styles/auth-gate.css";

const CONSENT_VERSION = "2026-09-v1";

function GoogleGlyph() {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" focusable="false">
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
    </span>
  );
}

export function SignInPage() {
  const { t } = useJdDsT();
  const { language, setLanguage } = useLanguage();
  const { prefs, toggleTheme } = useReaderPreferences();
  const {
    signInWithGoogle,
    isLoggedIn,
    authError,
    clearAuthError,
  } = useReaderAccount();
  const configured = isSupabaseConfigured();

  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);
  const [previewRemaining, setPreviewRemaining] = useState(5);
  const [previewFinished, setPreviewFinished] = useState(false);
  const [policyModal, setPolicyModal] = useState<"terms" | "privacy" | null>(null);

  const isHindi = language === "hi";

  // Already authenticated: auto redirect
  useEffect(() => {
    if (isLoggedIn && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      window.location.href = next;
    }
  }, [isLoggedIn]);

  // Phase A: 5-Second Product Preview Countdown
  useEffect(() => {
    if (previewRemaining <= 0) {
      setPreviewFinished(true);
      return;
    }
    const timer = setInterval(() => {
      setPreviewRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPreviewFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [previewRemaining]);

  // Load previously given consent if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVersion = localStorage.getItem("jd_consent_version");
      if (savedVersion === CONSENT_VERSION) {
        setConsentChecked(true);
      }
    }
  }, []);

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setConsentChecked(checked);
    if (checked) {
      setShowConsentWarning(false);
    }
  };

  const onGoogle = async () => {
    if (!consentChecked) {
      setShowConsentWarning(true);
      return;
    }
    clearAuthError();
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
      {/* ─── Top Control Bar: Logo + District + Language + Theme ────── */}
      <header
        style={{
          height: 52,
          borderBottom: "1px solid var(--jd-line)",
          background: "var(--jd-paper-2, #ffffff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          position: "relative",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#c8102e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            ज
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", color: "var(--jd-ink)" }}>
            {isHindi ? "जन दर्पण" : "JAN DARPAN"}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(0, 0, 0, 0.05)",
              padding: "2px 8px",
              borderRadius: 4,
              color: "var(--jd-ink-3)",
            }}
          >
            {isHindi ? "रायपुर ▾" : "Raipur ▾"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Language Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: "rgba(0,0,0,0.06)",
              borderRadius: 4,
              padding: 2,
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              style={{
                background: language === "hi" ? "#c8102e" : "transparent",
                color: language === "hi" ? "#ffffff" : "var(--jd-ink-secondary)",
                border: 0,
                borderRadius: 3,
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              style={{
                background: language === "en" ? "#c8102e" : "transparent",
                color: language === "en" ? "#ffffff" : "var(--jd-ink-secondary)",
                border: 0,
                borderRadius: 3,
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              EN
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={prefs.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "transparent",
              border: "1px solid var(--jd-line)",
              borderRadius: 4,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              cursor: "pointer",
              color: "var(--jd-ink)",
            }}
          >
            {prefs.theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* ─── 1. REALISTIC BLURRED JAN DARPAN PLATFORM BACKDROP ──────── */}
      <div className="jd-auth-gate-backdrop" aria-hidden="true" tabIndex={-1}>
        <div className="jd-auth-mock-shell">
          <div className="jd-auth-mock-grid">
            {/* Left: TV Studio Live Anchor Desk */}
            <div className="jd-auth-mock-tv">
              <div
                className="jd-auth-mock-anchor"
                style={{
                  backgroundImage: "url('/images/anchor-fallback.jpg')",
                  backgroundColor: "#1e293b",
                }}
              />
              <div className="jd-auth-mock-overlay-ui">
                <div className="jd-auth-mock-pill">
                  <span style={{ color: "#ef4444" }}>●</span> LIVE • {isHindi ? "रायपुर (छत्तीसगढ़)" : "Raipur (CG)"}
                </div>
                <div className="jd-auth-mock-pill">
                  🔊 {isHindi ? "आवाज़ चालू करें" : "Unmute Studio"}
                </div>
              </div>
              <div className="jd-auth-mock-ticker">
                <span style={{ background: "#991b1b", padding: "2px 6px", borderRadius: 3, fontSize: 11, fontWeight: 900 }}>
                  {isHindi ? "मुख्य खबर" : "BREAKING"}
                </span>
                <span>
                  {isHindi
                    ? "रायपुर-दुर्ग नेशनल हाईवे पर भारी जलभराव से यातायात प्रभावित, प्रशासन ने जारी किया रेड अलर्ट..."
                    : "Heavy waterlogging disrupts traffic on Raipur-Durg National Highway, authorities issue advisory..."}
                </span>
              </div>
            </div>

            {/* Right: Live Interactive Queue Cards */}
            <div className="jd-auth-mock-queue">
              {[
                { tag: isHindi ? "रायपुर • 13 घंटे पहले" : "Raipur • 13h ago", likes: 2, comments: 2, views: 0 },
                { tag: isHindi ? "रायपुर • 1 दिन पहले" : "Raipur • 1d ago", likes: 0, comments: 0, views: 2 },
                { tag: isHindi ? "रायपुर • 1 दिन पहले" : "Raipur • 1d ago", likes: 0, comments: 0, views: 0 },
                { tag: isHindi ? "रायपुर • 2 दिन पहले" : "Raipur • 2d ago", likes: 0, comments: 0, views: 2 },
              ].map((item, idx) => (
                <div key={idx} className="jd-auth-mock-card">
                  <div className="jd-auth-mock-thumb" />
                  <div className="jd-auth-mock-lines">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#c8102e" }}>{item.tag}</span>
                    <div className="jd-auth-mock-line" />
                    <div className="jd-auth-mock-line jd-auth-mock-line--short" />
                    <div className="jd-auth-mock-engagement">
                      <span>🤍 {item.likes}</span>
                      <span>💬 {item.comments}</span>
                      <span>👁 {item.views}</span>
                      <span>🟢</span>
                      <span style={{ marginLeft: "auto", background: "#c8102e", color: "#fff", padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>
                        {isHindi ? "📖 पढ़ें" : "📖 Read"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. TRANSLUCENT OVERLAY & 5-SECOND PREVIEW MODAL ────────── */}
      <div className="jd-auth-gate-scrim">
        {/* Phase A: 5-Second Visual Preview Banner */}
        <div className="jd-auth-preview-banner">
          <div className="jd-auth-preview-left">
            <span className="jd-auth-preview-dot" />
            <span>
              {previewFinished
                ? isHindi
                  ? "लाइव प्रसारण लॉक है — पूर्ण बुलेटिन देखने के लिए साइन इन करें"
                  : "Live broadcast locked — Sign in to unlock full coverage"
                : isHindi
                ? "जन दर्पण लाइव पूर्वावलोकन • छत्तीसगढ़ का नंबर 1 निष्पक्ष समाचार नेटवर्क"
                : "Jan Darpan Live Preview • Chhattisgarh's #1 Verified News Network"}
            </span>
          </div>
          <span className="jd-auth-preview-timer">
            {previewFinished
              ? isHindi
                ? "🔒 सुरक्षित लॉगिन"
                : "🔒 Secure Sign-In"
              : isHindi
              ? `पूर्वावलोकन: ${previewRemaining}s`
              : `Preview: ${previewRemaining}s`}
          </span>
        </div>

        {/* Centered Premium Authentication Modal */}
        <div className="jd-auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          {/* Header Branding */}
          <div className="jd-auth-brand-badge">
            <div className="jd-auth-brand-emblem" aria-hidden="true">ज</div>
            <span className="jd-auth-brand-name">
              {isHindi ? "जन दर्पण" : "JAN DARPAN"}
            </span>
          </div>

          <h1 id="auth-modal-title" className="jd-auth-title jd-serif">
            {isHindi ? "छत्तीसगढ़ की खबरें, सबसे पहले।" : "Chhattisgarh’s News, First & Verified."}
          </h1>

          <p className="jd-auth-subtitle">
            {isHindi
              ? "एक टैप में Jan Darpan में प्रवेश करें और लाइव खबरें देखें।"
              : "Access Jan Darpan in one tap and watch live news."}
          </p>

          {/* FOMO Product Value Highlights (4 Pills) */}
          <div className="jd-auth-fomo-grid">
            <div className="jd-auth-fomo-pill">
              <span className="jd-auth-fomo-icon" aria-hidden="true">🔴</span>
              <span>{isHindi ? "लाइव टीवी बुलेटिन" : "Live TV Broadcast"}</span>
            </div>
            <div className="jd-auth-fomo-pill">
              <span className="jd-auth-fomo-icon" aria-hidden="true">📍</span>
              <span>{isHindi ? "ज़िलेवार ताज़ा खबरें" : "District-First News"}</span>
            </div>
            <div className="jd-auth-fomo-pill">
              <span className="jd-auth-fomo-icon" aria-hidden="true">⚡</span>
              <span>{isHindi ? "सत्यापित ब्रेकिंग" : "Verified Coverage"}</span>
            </div>
            <div className="jd-auth-fomo-pill">
              <span className="jd-auth-fomo-icon" aria-hidden="true">🌐</span>
              <span>{isHindi ? "हिंदी और अंग्रेज़ी" : "Bilingual (HI / EN)"}</span>
            </div>
          </div>

          {/* Explicit Terms & Legal Consent Checkbox */}
          <div className="jd-auth-consent-box">
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
                      onClick={() => setPolicyModal("terms")}
                      className="jd-auth-link"
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                    >
                      नियम एवं शर्तें (Terms & Conditions)
                    </button>{" "}
                    और{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("privacy")}
                      className="jd-auth-link"
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                    >
                      गोपनीयता नीति (Privacy Policy)
                    </button>{" "}
                    से सहमत हूँ।
                  </>
                ) : (
                  <>
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("terms")}
                      className="jd-auth-link"
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                    >
                      Terms & Conditions
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => setPolicyModal("privacy")}
                      className="jd-auth-link"
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                    >
                      Privacy Policy
                    </button>
                    .
                  </>
                )}
              </span>
            </label>

            {/* UGC / Comment Moderation Notice */}
            <div className="jd-auth-ugc-notice">
              {isHindi ? (
                <>
                  साइन इन करके आप हमारे{" "}
                  <Link href="/community-guidelines" target="_blank" className="jd-auth-link">
                    समुदाय दिशानिर्देशों
                  </Link>{" "}
                  और टिप्पणी नियमों से सहमति व्यक्त करते हैं।
                </>
              ) : (
                <>
                  By signing in, you acknowledge our{" "}
                  <Link href="/community-guidelines" target="_blank" className="jd-auth-link">
                    Community Guidelines
                  </Link>{" "}
                  and comment moderation rules.
                </>
              )}
            </div>
          </div>

          {/* Primary Action: Continue with Google */}
          <div>
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy || !configured || !consentChecked}
              className="jd-auth-google-btn"
              aria-label={isHindi ? "Google से जारी रखें" : "Continue with Google"}
            >
              <GoogleGlyph />
              <span>{busy ? t("signin.loading") : isHindi ? "Google से जारी रखें" : "Continue with Google"}</span>
            </button>

            {showConsentWarning && !consentChecked ? (
              <p className="jd-auth-consent-hint">
                {isHindi
                  ? "⚠️ कृपया आगे बढ़ने के लिए नियम एवं गोपनीयता नीति को स्वीकार करें।"
                  : "⚠️ Please check the box to agree to the Terms & Privacy Policy to continue."}
              </p>
            ) : null}

            {authError ? (
              <p style={{ color: "#dc2626", fontSize: 12, marginTop: 10, textAlign: "center" }}>
                {authError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ─── Policy Preview Dialog (Quick In-Place Reading) ──────────── */}
      {policyModal && (
        <div className="jd-policy-dialog-scrim" onClick={() => setPolicyModal(null)}>
          <div className="jd-policy-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="jd-policy-dialog-header">
              <strong style={{ fontSize: 15 }}>
                {policyModal === "terms"
                  ? isHindi ? "नियम एवं शर्तें (Terms & Conditions)" : "Terms & Conditions"
                  : isHindi ? "गोपनीयता नीति (Privacy Policy)" : "Privacy Policy"}
              </strong>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="jd-policy-dialog-close"
              >
                ✕ {isHindi ? "बंद करें" : "Close"}
              </button>
            </div>
            <div className="jd-policy-dialog-body">
              {policyModal === "terms" ? (
                <div>
                  <p>
                    <strong>1. स्वीकृति (Acceptance):</strong> जन दर्पण का उपयोग करके, आप इन नियमों और शर्तों से बाध्य होने की सहमति देते हैं।
                  </p>
                  <p>
                    <strong>2. उपयोगकर्ता आचरण और टिप्पणियां (User Conduct & Comments):</strong> पाठक मंच पर सौहार्दपूर्ण संवाद बनाए रखने के लिए बाध्य हैं। अभद्र, भ्रामक, साम्प्रदायिक या गैर-कानूनी टिप्पणियां तत्काल हटाई जाएंगी और खाता निलंबित किया जा सकता है।
                  </p>
                  <p>
                    <strong>3. कॉपीराइट एवं सामग्री (Intellectual Property):</strong> जन दर्पण की सभी खबरें, वीडियो और बुलेटिन कॉपीराइट संरक्षित हैं।
                  </p>
                  <p>
                    <strong>4. देयता की सीमा (Limitation of Liability):</strong> जन दर्पण निष्पक्ष और सटीक पत्रकारिता प्रदान करता है। किसी भी तकनीकी रुकावट के लिए मंच उत्तरदायी नहीं होगा।
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <Link href="/terms" target="_blank" className="jd-auth-link">
                      {isHindi ? "पूर्ण नियम एवं शर्तें नए पेज पर पढ़ें →" : "Read full Terms in new tab →"}
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <p>
                    <strong>1. डेटा संग्रह (Data Collection):</strong> जन दर्पण केवल प्रमाणीकरण और व्यक्तिगत समाचार वरीयताओं के लिए आपका Google नाम और ईमेल सुरक्षित रूप से प्राप्त करता है।
                  </p>
                  <p>
                    <strong>2. गोपनीयता संरक्षण (Data Privacy):</strong> हम आपका व्यक्तिगत डेटा कभी भी किसी तीसरे पक्ष को विपणन या स्पैम के लिए नहीं बेचते।
                  </p>
                  <p>
                    <strong>3. कुकीज़ एवं विश्लेषण (Analytics):</strong> हम मंच के प्रदर्शन और पाठक अनुभव को बेहतर बनाने के लिए सुरक्षित कुकीज़ और Google Analytics का उपयोग करते हैं।
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <Link href="/privacy" target="_blank" className="jd-auth-link">
                      {isHindi ? "पूर्ण गोपनीयता नीति नए पेज पर पढ़ें →" : "Read full Privacy Policy in new tab →"}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
