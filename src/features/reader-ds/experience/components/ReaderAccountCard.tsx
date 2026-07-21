"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

type Props = {
  districtLabel: string;
};

function GoogleGlyph() {
  return (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#fff",
        border: "1px solid var(--jd-line)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 48 48" focusable="false">
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

/**
 * Top-of-More account card — discoverable Google sign-in when logged out;
 * identity + edit/settings/sign-out when logged in. Guest reading stays allowed.
 */
export function ReaderAccountCard({ districtLabel }: Props) {
  const { t } = useJdDsT();
  const {
    mounted,
    isLoggedIn,
    loading,
    displayName,
    avatarUrl,
    avatarInitial,
    email,
    syncStatus,
    authError,
    signInWithGoogle,
    signOut,
    continueAsGuest,
  } = useReaderAccount();

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const benefits = useMemo(
    () => [
      t("accountCard.benefitDistrict"),
      t("accountCard.benefitSaved"),
      t("accountCard.benefitLanguage"),
      t("accountCard.benefitNotify"),
      t("accountCard.benefitAudio"),
    ],
    [t]
  );

  async function onGoogle() {
    setLocalError(null);
    setBusy(true);
    try {
      await signInWithGoogle("/archive");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t("signin.googleFailed"));
      setBusy(false);
    }
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || (loading && !isLoggedIn && !authError)) {
    return (
      <section
        data-testid="jd-account-card"
        data-state="loading"
        aria-busy="true"
        style={{
          margin: "12px 16px 8px",
          padding: "16px",
          border: "1px solid var(--jd-line)",
          borderRadius: 4,
          background: "var(--jd-paper-2)",
        }}
      >
        <p className="jd-ui" style={{ margin: 0, fontSize: 13, color: "var(--jd-muted)" }}>
          {t("signin.loading")}
        </p>
      </section>
    );
  }

  if (isLoggedIn) {
    return (
      <section
        data-testid="jd-account-card"
        data-state="signed-in"
        aria-label={t("accountCard.signedInAria")}
        style={{
          margin: "12px 16px 8px",
          padding: "16px",
          border: "1px solid var(--jd-line)",
          borderRadius: 4,
          background: "var(--jd-paper-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={56}
              height={56}
              data-testid="jd-account-avatar"
              style={{
                width: 56,
                height: 56,
                borderRadius: 56,
                objectFit: "cover",
                flexShrink: 0,
                border: "1px solid var(--jd-line)",
              }}
            />
          ) : (
            <div
              data-testid="jd-account-avatar-fallback"
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: 56,
                background: "linear-gradient(135deg, var(--jd-navy), var(--jd-red))",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {avatarInitial}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="jd-serif"
              data-testid="jd-account-display-name"
              style={{ fontSize: 19, fontWeight: 700, color: "var(--jd-ink)" }}
            >
              {displayName}
            </div>
            {email ? (
              <div
                className="jd-ui"
                data-testid="jd-account-email"
                style={{
                  fontSize: 12,
                  color: "var(--jd-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {email}
              </div>
            ) : null}
            <div className="jd-ui" style={{ fontSize: 12, color: "var(--jd-ink-3)", marginTop: 2 }}>
              {districtLabel}
              {syncStatus ? ` · ${t(syncStatus)}` : null}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 14,
          }}
        >
          <Link
            href="/archive/edit-profile"
            data-testid="jd-account-edit-profile"
            className="jd-ui"
            style={{
              minHeight: 40,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              background: "var(--jd-navy)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            {t("accountCard.editProfile")}
          </Link>
          <Link
            href="/archive/accessibility"
            data-testid="jd-account-settings"
            className="jd-ui"
            style={{
              minHeight: 40,
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid var(--jd-line)",
              color: "var(--jd-ink)",
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
              borderRadius: 4,
              background: "var(--jd-paper)",
            }}
          >
            {t("accountCard.settings")}
          </Link>
          <button
            type="button"
            data-testid="jd-account-sign-out"
            className="jd-ui"
            disabled={busy}
            onClick={() => void onSignOut()}
            style={{
              minHeight: 40,
              padding: "0 14px",
              border: "1px solid var(--jd-line)",
              color: "var(--jd-ink-2)",
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 4,
              background: "transparent",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {t("account.signOut")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="jd-account-card"
      data-state="guest"
      aria-label={t("accountCard.guestAria")}
      style={{
        margin: "12px 16px 8px",
        padding: "16px",
        border: "1px solid var(--jd-line)",
        borderRadius: 4,
        background: "var(--jd-paper-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: 56,
            background: "linear-gradient(135deg, var(--jd-navy), var(--jd-red))",
            flexShrink: 0,
          }}
        />
        <div>
          <div
            className="jd-serif"
            data-testid="jd-account-guest-title"
            style={{ fontSize: 19, fontWeight: 700, color: "var(--jd-ink)" }}
          >
            {t("profile.reader")}
          </div>
          <div className="jd-ui" style={{ fontSize: 12, color: "var(--jd-muted)" }}>
            {t("accountCard.guestStatus")} · {districtLabel} · {t("profile.onDevice")}
          </div>
        </div>
      </div>

      <button
        type="button"
        data-testid="jd-account-google-signin"
        className="jd-ui"
        disabled={busy}
        onClick={() => void onGoogle()}
        style={{
          marginTop: 14,
          width: "100%",
          minHeight: 48,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "var(--jd-red)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          border: "none",
          borderRadius: 4,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        <GoogleGlyph />
        {busy ? t("signin.loading") : t("accountCard.googleSignIn")}
      </button>

      <button
        type="button"
        data-testid="jd-account-continue-guest"
        className="jd-ui"
        onClick={() => continueAsGuest()}
        style={{
          marginTop: 8,
          width: "100%",
          minHeight: 40,
          background: "transparent",
          border: "none",
          color: "var(--jd-ink-3)",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {t("accountCard.continueGuest")}
      </button>

      <ul
        data-testid="jd-account-benefits"
        style={{
          margin: "14px 0 0",
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 6,
        }}
      >
        {benefits.map((label) => (
          <li
            key={label}
            className="jd-ui"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              color: "var(--jd-ink-3)",
              lineHeight: 1.4,
            }}
          >
            <JdIcon name="star" size={14} stroke={1.8} color="var(--jd-gold)" />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {(localError || authError) && (
        <p
          role="alert"
          data-testid="jd-account-auth-error"
          className="jd-ui"
          style={{ margin: "12px 0 0", fontSize: 12, color: "var(--jd-red)" }}
        >
          {localError || authError}
        </p>
      )}
    </section>
  );
}
