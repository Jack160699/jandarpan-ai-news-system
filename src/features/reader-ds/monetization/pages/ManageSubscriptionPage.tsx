"use client";

import Link from "next/link";
import { useState } from "react";
import { Masthead } from "../../components/Masthead";
import { ReaderShell } from "../../components/ReaderShell";
import { JdIcon } from "../../components/icons";
import { SettingRow } from "../../experience/components/SettingRow";
import { useJdDsT } from "../../i18n";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

/** E42 — manage subscription from real isPremium; no cancel API invented. */
export function ManageSubscriptionPage() {
  const { t } = useJdDsT();
  const { isPremium, isLoggedIn } = useReaderAccount();
  const [autoRenew, setAutoRenew] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <ReaderShell activeNav="more">
      <Masthead back backHref="/archive" pageTitle={t("membership.title")} />
      <main id="main-content" role="main" style={{ flex: 1, overflow: "auto" }}>
        <div
          style={{
            margin: "14px 16px",
            background: "linear-gradient(135deg, var(--jd-navy), var(--jd-navy-deep))",
            borderRadius: 4,
            padding: 16,
            color: "var(--jd-paper)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <JdIcon name="star" size={18} stroke={1.8} color="var(--jd-gold)" />
            <span className="jd-ui" style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-gold-soft)" }}>
              {isPremium ? t("membership.active") : t("membership.inactive")}
            </span>
          </div>
          <div className="jd-ui" style={{ fontSize: 11.5, color: "#8ea0c4" }}>
            {isPremium
              ? t("membership.activeHint")
              : isLoggedIn
                ? t("membership.loggedInHint")
                : t("membership.guestHint")}
          </div>
        </div>

        <SettingRow
          icon="star"
          label={t("membership.changePlan")}
          sub={t("membership.changePlanSub")}
          href="/membership/plans"
        />
        <SettingRow
          icon="download"
          label={t("membership.receipts")}
          sub={isPremium ? t("membership.receiptsSub") : t("membership.receiptsSoon")}
        />
        <SettingRow
          label={t("membership.autoRenew")}
          sub={t("membership.autoRenewSub")}
          toggle={autoRenew}
          onToggle={setAutoRenew}
        />
        <SettingRow
          icon="rupee"
          label={t("membership.paymentMethod")}
          sub={t("membership.paymentMethodSub")}
        />

        <div style={{ padding: 16, marginTop: 4 }}>
          {!confirmCancel ? (
            <button
              type="button"
              className="jd-ui"
              onClick={() => setConfirmCancel(true)}
              disabled={!isPremium}
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                color: isPremium ? "var(--jd-red)" : "var(--jd-muted)",
                background: "none",
                border: "none",
                cursor: isPremium ? "pointer" : "not-allowed",
                minHeight: 44,
              }}
            >
              {t("membership.cancel")}
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p className="jd-ui" style={{ fontSize: 13, color: "var(--jd-ink-2)", marginBottom: 12 }}>
                {t("membership.cancelUnavailable")}
              </p>
              <Link
                href="/contact"
                className="jd-ui"
                style={{ fontSize: 13, fontWeight: 700, color: "var(--jd-navy)" }}
              >
                {t("membership.help")}
              </Link>
              {" · "}
              <button
                type="button"
                className="jd-ui"
                onClick={() => setConfirmCancel(false)}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--jd-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.back")}
              </button>
            </div>
          )}
        </div>
      </main>
    </ReaderShell>
  );
}
