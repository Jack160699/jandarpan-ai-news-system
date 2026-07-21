"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useSupabase } from "@/hooks/useSupabase";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { useJdDsT } from "../../i18n";

/**
 * D28 — Sign in / sign up (Plot-approved reader-ds composition).
 *
 * Auth reality (do not invent):
 * - Google OAuth: real via ReaderAccountProvider.signInWithGoogle
 * - Email magic link: retained (secondary, not in Plot) via signInWithOtp({ email })
 * - Phone OTP: Plot shows send CTA; full verify flow is not implemented — CTA disabled with honest label
 * - Guest: navigate home without creating a session
 */

function GoogleGlyph() {
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid var(--jd-line)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 48 48" focusable="false">
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

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
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
  const { client } = useSupabase();
  const configured = isSupabaseConfigured();

  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mobileValid = useMemo(() => /^\d{10}$/.test(mobile), [mobile]);

  async function onGoogle() {
    setStatus(null);
    clearAuthError();
    setBusy(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      await signInWithGoogle(next || "/archive");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t("signin.googleFailed"));
      setBusy(false);
    }
  }

  async function sendEmailLink() {
    if (!client || !email.trim()) return;
    setBusy(true);
    setStatus(null);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/archive")}`,
      },
    });
    setBusy(false);
    setStatus(error ? error.message : t("signin.emailSent"));
  }

  if (loading && !isLoggedIn) {
    return (
      <ReaderShell activeNav={null} hideBottomNav showPermissionSheets={false}>
        <Masthead back pageTitle={t("brand.name")} />
        <main id="main-content" role="main" style={{ flex: 1, padding: 24 }}>
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
          style={{ flex: 1, overflow: "auto", padding: "28px 18px 40px", maxWidth: 430, margin: "0 auto", width: "100%" }}
        >
          <h1 className="jd-serif" style={{ fontSize: 26, fontWeight: 700, color: "var(--jd-navy)", margin: 0 }}>
            {t("signin.signedIn")}
          </h1>
          <p className="jd-ui" style={{ marginTop: 10, fontSize: 14, color: "var(--jd-ink-3)", lineHeight: 1.5 }}>
            {t("signin.signedInAs")} {displayName}
          </p>
          <Link
            href="/"
            className="jd-ui"
            style={{
              display: "inline-flex",
              marginTop: 28,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px",
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            {t("signin.goHome")}
          </Link>
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
            fontWeight: 700,
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

        <div style={{ marginTop: 28 }}>
          <label
            htmlFor="jd-d28-mobile"
            className="jd-ui"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--jd-ink-3)",
              marginBottom: 8,
            }}
          >
            {t("signin.mobileLabel")}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              minHeight: 48,
              border: "1px solid var(--jd-line)",
              borderRadius: 4,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            <span
              className="jd-ui"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--jd-ink)",
                borderRight: "1px solid var(--jd-line)",
                flexShrink: 0,
              }}
            >
              +91
            </span>
            <input
              id="jd-d28-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(digitsOnly(e.target.value))}
              placeholder={t("signin.mobilePlaceholder")}
              aria-describedby="jd-d28-otp-note"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: "0 12px",
                fontSize: 16,
                fontFamily: "inherit",
                background: "transparent",
                color: "var(--jd-ink)",
                minWidth: 0,
              }}
            />
          </div>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t("signin.otpTitle")}
            style={{
              marginTop: 14,
              width: "100%",
              minHeight: 48,
              border: "none",
              borderRadius: 4,
              background: "var(--jd-red)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 700,
              opacity: 0.55,
              cursor: "not-allowed",
            }}
          >
            {t("signin.sendOtp")}
          </button>
          <p
            id="jd-d28-otp-note"
            className="jd-ui"
            style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.45, color: "var(--jd-ink-3)" }}
          >
            {t("signin.otpUnavailable")}
            {!mobileValid && mobile.length > 0 ? ` · ${t("signin.invalidMobile")}` : null}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "22px 0",
          }}
          aria-hidden
        >
          <div style={{ flex: 1, height: 1, background: "var(--jd-line)" }} />
          <span className="jd-ui" style={{ fontSize: 12, color: "var(--jd-muted)" }}>
            {t("signin.or")}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--jd-line)" }} />
        </div>

        <button
          type="button"
          onClick={() => void onGoogle()}
          disabled={busy || !configured}
          style={{
            width: "100%",
            minHeight: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            border: "1px solid var(--jd-line)",
            borderRadius: 4,
            background: "#fff",
            color: "var(--jd-navy)",
            fontFamily: "inherit",
            fontSize: 15,
            fontWeight: 700,
            cursor: busy || !configured ? "not-allowed" : "pointer",
            opacity: !configured ? 0.55 : 1,
          }}
        >
          <GoogleGlyph />
          {t("signin.google")}
        </button>

        {!configured ? (
          <p className="jd-ui" style={{ marginTop: 10, fontSize: 11.5, color: "var(--jd-amber)" }}>
            {t("signin.supabaseMissing")}
          </p>
        ) : null}

        <div style={{ textAlign: "center", marginTop: 22 }}>
          <Link
            href="/"
            className="jd-ui"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--jd-navy)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "underline",
              minHeight: 44,
            }}
          >
            {t("signin.guest")}
          </Link>
        </div>

        <div style={{ marginTop: 28, borderTop: "1px solid var(--jd-line-2)", paddingTop: 16 }}>
          <button
            type="button"
            className="jd-ui"
            onClick={() => setShowEmail((v) => !v)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--jd-ink-3)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline",
            }}
            aria-expanded={showEmail}
          >
            {showEmail ? t("signin.emailHide") : t("signin.emailToggle")}
          </button>
          {showEmail ? (
            <div style={{ marginTop: 12 }}>
              <label
                htmlFor="jd-d28-email"
                className="jd-ui"
                style={{ display: "block", fontSize: 12, color: "var(--jd-ink-3)", marginBottom: 6 }}
              >
                {t("signin.emailLabel")}
              </label>
              <input
                id="jd-d28-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  minHeight: 44,
                  boxSizing: "border-box",
                  border: "1px solid var(--jd-line)",
                  borderRadius: 4,
                  padding: "0 12px",
                  fontSize: 15,
                  fontFamily: "inherit",
                  background: "#fff",
                }}
              />
              <button
                type="button"
                onClick={() => void sendEmailLink()}
                disabled={!configured || busy || !email.trim()}
                style={{
                  marginTop: 10,
                  width: "100%",
                  minHeight: 44,
                  border: "1px solid var(--jd-line)",
                  borderRadius: 4,
                  background: "var(--jd-paper-2)",
                  color: "var(--jd-navy)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: !configured || busy || !email.trim() ? "not-allowed" : "pointer",
                }}
              >
                {t("signin.emailSend")}
              </button>
            </div>
          ) : null}
        </div>

        {(status || authError) ? (
          <p
            role="alert"
            data-testid="jd-signin-auth-error"
            className="jd-ui"
            style={{ marginTop: 16, fontSize: 13, color: "var(--jd-red)", lineHeight: 1.45 }}
          >
            {status || authError}
          </p>
        ) : null}

        <p className="jd-ui jd-signin-privacy-mobile">{t("signin.privacyTrust")}</p>
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
