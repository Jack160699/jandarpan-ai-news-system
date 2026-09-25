"use client";

import Link from "next/link";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { useJdDsT } from "../../i18n";

/**
 * Jan Darpan — Google-Only Authentication Screen.
 *
 * Requirements:
 * - Jan Darpan should provide Google authentication only.
 * - When the user taps Sign in or Sign up, the system directly initiates Google authentication.
 * - Do not display email/password, phone OTP, or unnecessary alternate providers.
 */

function GoogleGlyph() {
  return (
    <span
      aria-hidden
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid var(--jd-line)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 48 48" focusable="false">
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
  const {
    signInWithGoogle,
    isLoggedIn,
    displayName,
    loading,
    authError,
    clearAuthError,
  } = useReaderAccount();
  const configured = isSupabaseConfigured();

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogle() {
    setStatus(null);
    clearAuthError();
    setBusy(true);
    try {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const next = params?.get("next");
      await signInWithGoogle(next || "/profile");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t("signin.googleFailed"));
      setBusy(false);
    }
  }

  if (loading && !isLoggedIn) {
    return (
      <ReaderShell activeNav={null} hideBottomNav showPermissionSheets={false}>
        <Masthead back pageTitle={t("brand.name")} />
        <main id="main-content" role="main" style={{ flex: 1, padding: 24, textAlign: "center" }}>
          <p className="jd-ui" style={{ color: "var(--jd-muted)" }}>
            {t("signin.loading")}
          </p>
        </main>
      </ReaderShell>
    );
  }

  if (isLoggedIn) {
    return (
      <ReaderShell activeNav={null} hideBottomNav showPermissionSheets={false}>
        <Masthead back pageTitle={t("brand.name")} />
        <main
          id="main-content"
          role="main"
          style={{
            flex: 1,
            overflow: "auto",
            padding: "28px 18px 40px",
            maxWidth: 460,
            margin: "0 auto",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h1 className="jd-serif" style={{ fontSize: 26, fontWeight: 700, color: "var(--jd-navy)", margin: 0 }}>
            {t("signin.signedIn")}
          </h1>
          <p className="jd-ui" style={{ marginTop: 10, fontSize: 14, color: "var(--jd-ink-3)", lineHeight: 1.5 }}>
            {t("signin.signedInAs")} <strong>{displayName}</strong>
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center" }}>
            <Link
              href="/profile"
              className="jd-ui"
              style={{
                display: "inline-flex",
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                background: "var(--jd-navy)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                borderRadius: 4,
              }}
            >
              प्रोफ़ाइल देखें
            </Link>
            <Link
              href="/"
              className="jd-ui"
              style={{
                display: "inline-flex",
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                padding: "0 20px",
                background: "var(--jd-red)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                borderRadius: 4,
              }}
            >
              {t("signin.goHome")}
            </Link>
          </div>
        </main>
      </ReaderShell>
    );
  }

  return (
    <ReaderShell activeNav={null} hideBottomNav showPermissionSheets={false}>
      <Masthead back pageTitle={t("brand.name")} />
      <main id="main-content" role="main" className="jd-signin-page">
        <div className="jd-signin-card" data-testid="jd-login-two-panel">
          <aside className="jd-signin-brand-panel" data-testid="jd-login-brand-panel" aria-hidden={false}>
            <div className="jd-desk-mark jd-desk-mark--lg" aria-hidden>
              ज
            </div>
            <h2 className="jd-serif jd-signin-brand-panel__title">{t("signin.brandPanelTitle")}</h2>
            <p className="jd-ui jd-signin-brand-panel__body">{t("signin.brandPanelBody")}</p>
            <p className="jd-ui jd-signin-brand-panel__trust">{t("signin.privacyTrust")}</p>
          </aside>

          <div className="jd-signin-form-panel" data-testid="jd-login-auth-panel">
            <h1
              className="jd-serif"
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "var(--jd-navy)",
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              {t("signin.welcome")}
            </h1>
            <p
              className="jd-ui"
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--jd-ink-3)",
                width: "100%",
              }}
            >
              {t("signin.subtitle")}
            </p>

            {/* Direct Google Authentication CTA */}
            <div style={{ marginTop: 32 }}>
              <button
                type="button"
                onClick={() => void onGoogle()}
                disabled={busy || !configured}
                style={{
                  width: "100%",
                  minHeight: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  border: "1px solid var(--jd-line)",
                  borderRadius: 6,
                  background: "#ffffff",
                  color: "#1f2937",
                  fontFamily: "inherit",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: busy || !configured ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.15s ease",
                }}
              >
                <GoogleGlyph />
                <span>Google से साइन इन / साइन अप करें</span>
              </button>

              <p
                style={{
                  fontSize: 12,
                  color: "var(--jd-muted, #736b5e)",
                  textAlign: "center",
                  marginTop: 12,
                  lineHeight: 1.4,
                }}
              >
                जन दर्पण केवल सुरक्षित Google प्रमाणीकरण का उपयोग करता है।
              </p>
            </div>

            {status || authError ? (
              <p className="jd-ui" style={{ marginTop: 14, fontSize: 13, color: "var(--jd-red)", textAlign: "center" }}>
                {status || authError}
              </p>
            ) : null}

            {!configured ? (
              <p className="jd-ui" style={{ marginTop: 10, fontSize: 11.5, color: "var(--jd-amber)" }}>
                {t("signin.supabaseMissing")}
              </p>
            ) : null}

            <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--jd-line-2)" }}>
              <Link
                href="/"
                className="jd-ui"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--jd-navy)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  textDecoration: "underline",
                  minHeight: 44,
                }}
              >
                {t("signin.guest")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
