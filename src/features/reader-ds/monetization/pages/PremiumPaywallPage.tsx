"use client";

import Link from "next/link";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { Tag } from "../../components/primitives";
import { JdIcon } from "../../components/icons";
import { Byline } from "../../article/components/Byline";
import { useJdDsT } from "../../i18n";

type PaywallReport = {
  slug: string;
  title: string;
  excerpt?: string | null;
  price_inr?: number | null;
  author?: string | null;
};

/** E38 — preview + fade + paywall card for premium reports. */
export function PremiumPaywallPage({ report }: { report: PaywallReport }) {
  const { t } = useJdDsT();
  const price =
    typeof report.price_inr === "number" && report.price_inr > 0
      ? `₹${report.price_inr}`
      : t("membership.defaultPrice");

  const preview = report.excerpt?.trim() || t("membership.previewFallback");

  return (
    <ReaderShell activeNav="home" hideBottomNav reserveMiniPlayer={false}>
      <Masthead back backHref="/" />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "12px 16px 0", position: "relative" }}>
          <Tag>{t("membership.deepTag")}</Tag>
          <h1
            className="jd-serif"
            style={{
              margin: "6px 0 8px",
              fontSize: 22,
              lineHeight: 1.3,
              fontWeight: 700,
              overflowWrap: "anywhere",
            }}
          >
            {report.title}
          </h1>
          <Byline
            author={report.author?.trim() || t("membership.premiumAuthor")}
            role={t("membership.specialReport")}
          />
          <div style={{ position: "relative", maxHeight: 120, overflow: "hidden" }}>
            <p
              className="jd-serif"
              style={{
                margin: "0 0 12px",
                fontSize: 15,
                lineHeight: 1.75,
                color: "var(--jd-ink-2)",
              }}
            >
              {preview}
            </p>
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 80,
                background: "linear-gradient(transparent, var(--jd-paper))",
              }}
            />
          </div>
        </div>

        <div
          style={{
            margin: "0 16px 16px",
            border: "1.5px solid var(--jd-gold)",
            borderRadius: 4,
            padding: "18px",
            textAlign: "center",
            background: "#fbf3e6",
          }}
        >
          <JdIcon name="lock" size={26} stroke={1.8} color="var(--jd-amber, #c07a1e)" />
          <div
            className="jd-serif"
            style={{ fontSize: 17, fontWeight: 700, margin: "8px 0 4px", color: "var(--jd-ink)" }}
          >
            {t("membership.paywallTitle")}
          </div>
          <div className="jd-ui" style={{ fontSize: 12.5, color: "var(--jd-ink-3)", marginBottom: 14 }}>
            {t("membership.paywallBody")}
          </div>
          <Link
            href="/membership/plans"
            className="jd-ui"
            style={{
              display: "block",
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13.5,
              padding: "12px 0",
              borderRadius: 3,
              marginBottom: 8,
              textDecoration: "none",
            }}
          >
            {t("membership.joinFor", { price })}
          </Link>
          <div className="jd-ui" style={{ fontSize: 12, color: "var(--jd-navy)" }}>
            {t("membership.alreadyMember")}{" "}
            <Link href="/login" style={{ fontWeight: 700, textDecoration: "underline", color: "inherit" }}>
              {t("membership.signIn")}
            </Link>
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
