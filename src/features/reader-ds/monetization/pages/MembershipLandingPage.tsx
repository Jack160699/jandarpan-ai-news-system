"use client";

import Link from "next/link";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon, type JdIconName } from "../../components/icons";
import { useJdDsT } from "../../i18n";
import type { JdDsStringKey } from "../../i18n/strings";

const BENEFITS: Array<{ icon: JdIconName; labelKey: JdDsStringKey }> = [
  { icon: "star", labelKey: "membership.benefitAdFree" },
  { icon: "eye", labelKey: "membership.benefitAnalysis" },
  { icon: "download", labelKey: "membership.benefitEpaper" },
  { icon: "headphone", labelKey: "membership.benefitAudio" },
];

/** E36 — dark membership landing. */
export function MembershipLandingPage({
  fromPriceLabel,
}: {
  fromPriceLabel?: string;
}) {
  const { t } = useJdDsT();
  const cta = fromPriceLabel ?? t("membership.join");

  return (
    <ReaderShell activeNav="more" dark hideBottomNav reserveMiniPlayer={false}>
      <div
        style={{
          flexShrink: 0,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/archive" aria-label={t("membership.closeAria")} style={{ display: "flex", color: "#e7edf6" }}>
          <JdIcon name="close" size={22} stroke={2} color="#e7edf6" />
        </Link>
        <span
          className="jd-ui"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "var(--jd-gold)" }}
        >
          {t("membership.landing")}
        </span>
        <span style={{ width: 22 }} aria-hidden />
      </div>
      <main
        id="main-content"
        role="main"
        style={{ flex: 1, overflow: "auto", padding: "10px 20px 24px" }}
      >
        <div className="jd-brand" style={{ fontSize: 30, color: "#e7edf6", marginBottom: 6 }}>
          {t("membership.landing")}
        </div>
        <h1
          className="jd-serif"
          style={{
            margin: "0 0 18px",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--jd-gold-soft)",
            lineHeight: 1.35,
          }}
        >
          {t("membership.tagline")}
        </h1>
        {BENEFITS.map((b) => (
          <div
            key={b.labelKey}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 0",
              borderBottom: "1px solid rgba(150,175,215,0.16)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 34,
                background: "rgba(193,154,62,.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <JdIcon name={b.icon} size={18} stroke={1.9} color="var(--jd-gold)" />
            </div>
            <span className="jd-serif" style={{ fontSize: 15, color: "#e7edf6", fontWeight: 500 }}>
              {t(b.labelKey)}
            </span>
          </div>
        ))}
        <p
          className="jd-ui"
          style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "#93a4c2" }}
        >
          {t("membership.checkoutComing")}
        </p>
      </main>
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px max(12px, env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(150,175,215,0.16)",
          background: "#0e1626",
        }}
      >
        <Link
          href="/membership/plans"
          className="jd-ui"
          style={{
            display: "block",
            textAlign: "center",
            background: "var(--jd-gold)",
            color: "var(--jd-navy)",
            fontWeight: 800,
            fontSize: 14.5,
            padding: "14px 0",
            borderRadius: 3,
            textDecoration: "none",
          }}
        >
          {cta}
        </Link>
      </div>
    </ReaderShell>
  );
}
