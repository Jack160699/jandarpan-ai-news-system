"use client";

import Link from "next/link";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { useJdDsT } from "../../i18n";

/** E41 — failure / not-live checkout. Never claims a charge occurred. */
export function PaymentFailurePage({
  reason,
  planSlug,
}: {
  reason?: string | null;
  planSlug?: string | null;
}) {
  const { t } = useJdDsT();
  const code =
    reason === "checkout-not-live"
      ? t("membership.failureCheckoutNotLive")
      : reason === "unverified"
        ? t("membership.failureUnverified")
        : reason
          ? t("membership.failureError", { reason })
          : t("membership.failureGeneric");

  const retryHref = planSlug
    ? `/membership/checkout?plan=${encodeURIComponent(planSlug)}`
    : "/membership/checkout";

  return (
    <ReaderShell activeNav="more" hideBottomNav reserveMiniPlayer={false}>
      <Masthead hideActions />
      <main
        id="main-content"
        role="main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 76,
            background: "rgba(158,27,34,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <JdIcon name="alert" size={40} stroke={1.8} color="var(--jd-red)" />
        </div>
        <h1 className="jd-serif" style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>
          {t("membership.failureTitle")}
        </h1>
        <p
          className="jd-ui"
          style={{ margin: "0 0 8px", fontSize: 13, color: "var(--jd-ink-3)", lineHeight: 1.6 }}
        >
          {t("membership.failureBody")}
        </p>
        <div className="jd-ui" style={{ fontSize: 11, color: "var(--jd-muted)", marginBottom: 22 }}>
          {code}
        </div>
        <Link
          href={retryHref}
          className="jd-ui"
          style={{
            width: "100%",
            background: "var(--jd-red)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            padding: "14px 0",
            borderRadius: 3,
            textDecoration: "none",
            display: "block",
            marginBottom: 10,
          }}
        >
          {t("membership.retry")}
        </Link>
        <Link
          href="/membership/plans"
          className="jd-ui"
          style={{
            width: "100%",
            border: "1.5px solid var(--jd-navy)",
            color: "var(--jd-navy)",
            fontWeight: 700,
            fontSize: 13.5,
            padding: "12px 0",
            borderRadius: 3,
            textDecoration: "none",
            display: "block",
            marginBottom: 16,
          }}
        >
          {t("membership.otherMethod")}
        </Link>
        <Link
          href="/contact"
          className="jd-ui"
          style={{ fontSize: 12, color: "var(--jd-navy)", textDecoration: "underline" }}
        >
          {t("membership.contactSupport")}
        </Link>
      </main>
    </ReaderShell>
  );
}
